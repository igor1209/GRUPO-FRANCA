import os
import threading
from datetime import datetime
from .core import Provider, apply_turn, DEFAULTS, now

class CommercialService:
    def __init__(self):
        self.key = ''
        self.lock = threading.Lock()

    def execute(self, store, data):
        SESSION_KEY = self.key
        cfg = store.config()
        action = data.get('action')
        if action in ('profile','block','cadence_save','cadence_assign','cadence_next','cadence_cancel'):
            return (store.workspace_action(data))
        if action == 'config':
            for k in DEFAULTS:
                if k in data:
                    cfg[k] = str(data[k]).strip()
            for k in ('daily_limit', 'start', 'end'):
                cfg[k] = int(cfg[k])
            if cfg['provider'] not in ('França IA', 'Regras (teste)', 'OpenAI', 'Ollama local') or not 0 <= cfg['start'] < cfg['end'] <= 24 or not 1 <= cfg['daily_limit'] <= 10000:
                raise ValueError('Confira o motor, o limite e as horas de atendimento.')
            if any(not cfg[k] or len(cfg[k]) > 10000 for k in ('outbound','inbound','question','invite','knowledge','openai_model')):
                raise ValueError('Preencha os textos e o modelo, com até 10.000 caracteres por campo.')
            store.save_config(cfg)
            if data.get('key', '').strip():
                self.key = data['key'].strip()
            return ({'ok': True})
        if action == 'create':
            lid = store.create(*(str(data.get(k, '')).strip() for k in ('name','company','contact')), origin=data.get('origin', 'Outbound'), target=data.get('target', 'Ambos'))
            return ({'id': lid})
        lid = int(data.get('id', 0))
        lead = store.lead(lid)
        if not lead:
            raise ValueError('Selecione um contato válido.')
        if action == 'notes':
            value = str(data.get('followup', ''))
            if value:
                from datetime import datetime
                dt = datetime.fromisoformat(value)
                if dt <= now() or lead['blocked']:
                    raise ValueError('O retorno deve ser futuro e o contato deve estar disponível.')
                value = dt.isoformat()
            store.update(lid, notes=str(data.get('notes',''))[:20000], followup=value)
        elif action == 'pause':
            if lead['blocked']:
                raise ValueError('Este contato pediu para não ser contatado.')
            fields = {'paused': 0 if lead['paused'] else 1}
            if lead['phase'] == 'paused' and lead['paused']:
                fields['phase'] = 'invite' if lead['need'] else 'need'
            store.update(lid, **fields)
        elif action == 'cancel':
            with store.db:
                result = store.db.execute('UPDATE meetings SET active=0 WHERE id=? AND lead_id=? AND active=1', (int(data['meeting']),lid))
            if not result.rowcount:
                raise ValueError('Reserva não encontrada.')
            store.update(lid, phase='stopped' if lead['blocked'] else 'invite', proposed='', offered='[]')
            store.message(lid,'human','Reserva cancelada no painel local. Sem envio externo.','Operação interna')
        elif action in ('send', 'retry'):
            if lead['blocked']:
                raise ValueError('Contato bloqueado após recusa.')
            manual = bool(data.get('manual')) and action == 'send'
            if lead['paused'] and not manual:
                raise ValueError('A SDR está pausada. Retome ou escreva como Igor.')
            messages = [m for m in store.messages(lid) if m['role'] != 'error']
            if action == 'send':
                text = str(data.get('text', '')).strip()
                if not 0 < len(text) <= 4000:
                    raise ValueError('Envie de 1 a 4.000 caracteres.')
                if messages and messages[-1]['role'] == 'user' and not manual:
                    raise ValueError('Há uma mensagem pendente. Clique em Tentar resposta pendente.')
                store.message(lid, 'human' if manual else 'user', text, 'Manual' if manual else 'Teste web')
            elif not messages or messages[-1]['role'] != 'user':
                raise ValueError('Não há mensagem pendente de resposta.')
            if manual:
                store.update(lid, paused=1)
            else:
                messages = store.messages(lid)
                text = next(m['text'] for m in reversed(messages) if m['role'] == 'user')
                fast = Provider.rules(text, lead['phase'])
                local = fast['intent'] in ('stop','human') or lead['phase'] in ('schedule','confirm','booked')
                uid = None
                try:
                    if cfg['provider'] != 'Regras (teste)' and not local:
                        uid = store.start_usage(cfg)
                    result, tokens = (fast,0) if local else Provider.interpret(cfg,SESSION_KEY or os.getenv('OPENAI_API_KEY',''),lead,messages)
                    answer = apply_turn(store,lid,text,result,cfg)
                    store.message(lid,'assistant',answer,'Validação local' if local else cfg['provider'])
                    if uid:
                        with store.db:
                            store.db.execute("UPDATE usage SET status='ok',tokens=? WHERE id=?",(tokens,uid))
                except Exception as exc:
                    error = str(exc) if isinstance(exc, ValueError) else 'Falha ao processar a resposta. Confira a configuração e tente novamente.'
                    store.message(lid,'error',error)
                    if uid:
                        with store.db:
                            store.db.execute("UPDATE usage SET status='erro' WHERE id=?",(uid,))
                    raise ValueError(error) from None
        else:
            raise ValueError('Ação não reconhecida.')
        return {'ok': True}
