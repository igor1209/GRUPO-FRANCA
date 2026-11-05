# Grupo França · Entrega consolidada da plataforma · 1.5

O WhatsApp de texto já foi conectado e os envios de teste foram validados por você. Esta entrega concentra contatos, importação, funil, acessos e acompanhamento da equipe. A IA de voz, a discagem, a qualificação por voz e as tentativas automáticas ficam para a etapa final.

## Aplicar sem excluir ou extrair pastas

Baixe ATUALIZAR_PLATAFORMA_1_5.ps1 e coloque dentro de GrupoFranca_Plataforma. Feche a plataforma com Ctrl+C no terminal e execute:

```powershell
cd "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR\GrupoFranca_Plataforma"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ATUALIZAR_PLATAFORMA_1_5.ps1" -PastaProjeto "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR\GrupoFranca_Plataforma"
if ($LASTEXITCODE -eq 0) { .\iniciar.bat }
```

O atualizador verifica os arquivos do pacote, faz backup do código que será substituído e aplica apenas as diferenças. Se houver falha durante a cópia, tenta restaurar os arquivos anteriores e informa qualquer restauração que precise ser feita manualmente. Ele inclui a interface compilada; não é necessário recompilar nem reinstalar o conector de WhatsApp.

A pasta backup_atualizacoes será criada no projeto. O atualizador não substitui o banco de dados, credenciais, contas, contatos, modelos salvos ou sessões de WhatsApp. Na primeira inicialização, o backend executa uma migração aditiva para preservar as etapas atuais do funil e passar a controlá-las manualmente. O backup padrão do SQLite continua sendo criado antes da inicialização.

Pré-requisito: a versão 1.4 do conector precisa estar instalada, como no ambiente em que você validou as mensagens. Se você executou o sistema usando uma pasta de dados personalizada, mantenha GF_SDR_DATA_DIR com o mesmo valor.

O script não foi executado no Windows neste ambiente. A integridade do conteúdo embarcado e a interface compilada foram verificadas; os testes do código foram executados aqui. O pareamento e os envios de texto reais foram validados por você na versão 1.4.

## Contatos e importação

Em Contatos, cadastre nome, empresa, telefone, e-mail, segmento, fonte, origem e etiquetas. O gerente pode escolher o responsável já no cadastro de um novo contato. Para transferir um contato existente, use Equipe → Distribuição.

Cada vendedor cadastra em sua própria carteira. Ele precisa da permissão Cadastrar contatos. A permissão Importar contatos permite importar novos contatos para a própria carteira, independentemente da permissão de cadastro individual.

Importação CSV:

1. Abra Contatos → Importar CSV.
2. Como gerente, escolha o responsável pelos novos contatos.
3. Selecione um CSV UTF-8, com até 700 KB e 500 linhas de dados.
4. Confira o mapeamento das colunas e a prévia de novos, duplicados e inválidos.
5. Se alterar o mapeamento, reanalise o arquivo.
6. Confirme a importação.

O responsável é definido pelo seletor, e não por um nome livre dentro do CSV. Isso mantém a carteira vinculada a uma conta real de usuário. Importações feitas pelo vendedor ficam na carteira dele.

Duplicados por telefone ou e-mail são ignorados sem sobrescrever o cadastro existente. A deduplicação também é conferida na confirmação. Repetir a confirmação do mesmo lote não cria novos contatos nem troca seus responsáveis. Se ocorrer uma falha no processamento, os novos contatos e suas atribuições são revertidos juntos.

O modelo CSV disponibilizado pela tela já tem o cabeçalho Telefone / contato reconhecido automaticamente. Filtros e exportação usam as mesmas etapas comerciais do funil. Segmento, fonte, origem e responsável continuam disponíveis nos filtros.

## Funil comercial

As etapas são Novos, Contatados, Qualificados, Reunião, Proposta, Ganho e Perdido.

O vendedor move os cards por arrastar e soltar ou pelo seletor de etapa de cada contato. O backend exige a permissão Mover oportunidades e verifica se o lead pertence à carteira do vendedor.

A movimentação permanece manual nesta etapa. Enviar ou receber mensagens de WhatsApp não muda o card de coluna. Os registros anteriores já exibidos no funil são preservados na atualização. Contatos bloqueados continuam com o pedido de não contato ativo e não podem ser movidos para contornar esse bloqueio.

Mover um card para Reunião não cria um compromisso na agenda nem envia uma mensagem. A reserva precisa ser registrada na Agenda. Ganho é um registro manual de venda, não uma confirmação automática de recebimento financeiro.

Salvar um motivo com o resultado Em aberto mantém a etapa atual. Reabrir um ganho ou uma perda retorna o contato para Contatados. As mudanças de etapa ficam no registro de atividades.

## Vendedores e permissões

Você continua sendo o único gerente. Em Equipe → Usuários, crie os funcionários, informe o nome, o usuário e uma senha temporária. No primeiro acesso, o funcionário precisa definir uma nova senha.

Para testar o painel de vendedor sem encerrar sua sessão de gerente, abra uma janela privativa do navegador, acesse http://127.0.0.1:8780 e entre com a conta do funcionário.

Permissões disponíveis:

- Cadastrar contatos.
- Editar contatos e acompanhamentos.
- Mover oportunidades no funil.
- Enviar mensagens de WhatsApp.
- Agendar reuniões.
- Importar contatos.
- Executar cadências existentes.

O vendedor acessa os contatos, notas, reuniões e dados comerciais da própria carteira. Ele não administra usuários, não distribui leads e não altera o agente ou as conexões. Alterar permissões, redefinir senha ou desativar uma conta invalida as sessões anteriores.

## Distribuição de leads

Em Equipe → Distribuição, você pode transferir um contato por vez ou selecionar um lote:

1. Use a busca para localizar os contatos.
2. Marque os contatos desejados, até 500 por lote.
3. Escolha o responsável do lote.
4. Clique em Atribuir selecionados.

O seletor do cabeçalho marca os primeiros 500 resultados do filtro, respeitando o limite total. Seleções já feitas podem permanecer ao mudar a busca; confira o contador antes de atribuir. Somente usuários ativos aparecem como destinos.

A operação valida todos os contatos antes de gravar. Se algum item for inválido, nada é transferido. A carteira de acesso é atualizada no backend. Cada transferência é registrada nas atividades do gerente. Repetir a mesma atribuição não duplica o registro de transferência.

## Painel do gerente e indicadores

Equipe → Desempenho apresenta ranking por vendas registradas e contatos trabalhados, carteira atual, reuniões reais, retornos vencidos e meta mensal. Os filtros De e Até definem o período das atividades, vendas e reuniões. Carteira e retornos mostram a situação atual.

Vendas são ganhos manuais ainda ativos na carteira atual da pessoa que os registrou; uma reabertura exclui o ganho dos números. Reuniões são reservas reais registradas, sem confundir uma mudança de coluna com um agendamento. A meta é mensal e deve ser comparada com o mês correspondente. O ranking é um acompanhamento de registros comerciais; não mede tempo de trabalho ou atividades fora da plataforma.

Os dados anteriores deixam de ser exportáveis enquanto um novo período está sendo carregado. Se a consulta falhar, a tela informa o erro e não exporta um relatório antigo como se fosse atual.

Em Análise comercial, acompanhe envios reais, respostas, qualificações registradas, reservas e oportunidades convertidas, com filtros por período e fonte. A qualificação manual do funil passa a contar nos indicadores. Testes de envio não contam como abordagens nem como contatos trabalhados. Falhas e envios sem confirmação de WhatsApp operacionais também entram no total de falhas; os testes ficam excluídos.

As taxas depois da abordagem usam somente os contatos cujo envio foi registrado no período selecionado e os eventos posteriores a esse envio no mesmo período. Uma qualificação sem envio no período pode aparecer no total de qualificados sem entrar nessa taxa. Eventos históricos começam quando o sistema os registrou; a atualização não inventa abordagens ou reuniões passadas.

## Como conferir após atualizar

- Entre como gerente e crie uma conta de vendedor.
- Cadastre um contato atribuído a esse vendedor ou importe um pequeno CSV para a carteira dele.
- Entre como vendedor na janela privativa e confira a carteira.
- Mova o contato no funil e confira a mesma etapa em Contatos.
- Volte ao gerente, transfira o contato para outro responsável e confirme que ele deixa de aparecer para o vendedor anterior após atualizar os dados.
- Confira os filtros e as atividades em Equipe. Testes de WhatsApp não devem aparecer como abordagens.

A aplicação continua local. Acesso por outros computadores e publicação na internet exigem uma etapa de infraestrutura própria.

## Validação desta entrega

105 testes do backend e 25 testes da interface passaram. O build de produção de React/TypeScript passou. Os testes incluem isolamento de carteiras, proibição de atribuição por vendedores, distribuição em lote, rollback da importação e das atribuições, repetição de importação, preservação das etapas anteriores, funil manual, qualificação manual nos indicadores, falhas operacionais do WhatsApp e prevenção de exportação de dados antigos durante a troca de período.

A IA de voz, a discagem e as novas tentativas automáticas permanecem para a etapa final. Não há chamadas simuladas apresentadas como reais.


# Código completo dos arquivos modificados

Os caminhos abaixo são relativos à pasta principal GrupoFranca_Plataforma. O atualizador também inclui o build da interface. Se copiar os códigos manualmente, execute reconstruir_interface.bat antes de iniciar.

## backend/main.py

```python
"""Local FastAPI application. Run from the project root with python iniciar.py."""
import json
import os
import secrets
import sqlite3
import threading
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .core import DEFAULTS, PHASES, now
from .commercial import GrowthService as CommercialService
from .team import TeamStore as WorkspaceStore, AccessError, authorize, scoped_state, password_hash, verify_password
from .commercial import RUNTIME
from . import whatsapp

ROOT = Path(__file__).resolve().parent.parent
BASE = Path(os.getenv('GF_SDR_DATA_DIR') or Path(os.getenv('LOCALAPPDATA', str(Path.home()))) / 'GrupoFrancaSDR')
DB = BASE / 'sdr.sqlite3'
DIST = ROOT / 'frontend' / 'dist'
TOKEN = secrets.token_urlsafe(32)
service = CommercialService()
wa_bridge = whatsapp.Bridge(ROOT, BASE, DB)
wa_lock = threading.Lock()

@asynccontextmanager
async def lifespan(app):
    BASE.mkdir(parents=True, exist_ok=True)
    wa_bridge.base, wa_bridge.db = BASE, DB
    if DB.exists():
        backup = BASE / 'backups' / ('antes_react_' + datetime.now().strftime('%Y%m%d_%H%M%S_%f') + '.sqlite3')
        backup.parent.mkdir(exist_ok=True)
        with sqlite3.connect(DB) as source, sqlite3.connect(backup) as target:
            source.backup(target)
    with_store = WorkspaceStore(DB)
    with with_store.db:
        with_store.db.execute("UPDATE gf_mail SET status='unknown',error='O processo foi interrompido durante o envio. Confira a caixa de e-mail antes de reconciliar.' WHERE status='sending'")
    whatsapp.schema(with_store)
    with with_store.db:
        with_store.db.execute("UPDATE wa_sends SET status='unknown',error='Processo interrompido durante o envio. Confira no WhatsApp antes de repetir.' WHERE status='sending'")
    restore_ids = [r[0] for r in with_store.db.execute('SELECT id FROM wa_connections WHERE reconnect=1')]
    with_store.db.close()
    def restore_whatsapp():
        for cid in restore_ids:
            try: wa_bridge.call('connect',cid)
            except ValueError: break
    restore_worker=threading.Thread(target=restore_whatsapp,daemon=True)
    restore_worker.start()
    stop = threading.Event()
    worker = threading.Thread(target=service.worker,args=(lambda:DB,stop),daemon=True)
    worker.start()
    try:
        yield
    finally:
        stop.set()
        RUNTIME.automation['enabled'] = False
        worker.join(timeout=1)
        restore_worker.join(timeout=1)
        wa_bridge.stop()

app = FastAPI(title='Grupo França Comercial', version='1.5.0', lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['127.0.0.1', 'localhost', '[::1]'])

@app.middleware('http')
async def local_session(request: Request, call_next):
    if request.url.path.startswith('/api'):
        origin = request.headers.get('origin')
        allowed = {'http://127.0.0.1:8780','http://localhost:8780','http://127.0.0.1:5173','http://localhost:5173'}
        if origin and origin not in allowed:
            return JSONResponse({'error':'Origem não permitida.'},403)
        if request.url.path != '/api/session' and request.headers.get('x-sdr-token') != TOKEN:
            return JSONResponse({'error':'Sessão expirada. Atualize a página.'},403)
        if request.method == 'POST':
            try: size = int(request.headers.get('content-length','0'))
            except ValueError: size = 0
            if not 0 < size <= 1200000:
                return JSONResponse({'error':'Solicitação muito grande ou inválida.'},413)
        if request.url.path != '/api/session' and not request.url.path.startswith('/api/auth/'):
            store = WorkspaceStore(DB)
            try:
                user = store.current_user(request.cookies.get('gf_session',''))
                if not user:
                    return JSONResponse({'error':'Entre na sua conta para continuar.'},401)
                if user['must_change']:
                    return JSONResponse({'error':'Altere sua senha antes de continuar.'},403)
                request.state.user = user
            finally:
                store.db.close()
    response = await call_next(request)
    if request.url.path == '/oauth/google/callback':
        request.scope['query_string'] = b''
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'no-referrer'
    if request.url.path.startswith('/api'): response.headers['Cache-Control'] = 'no-store'
    return response

@app.get('/api/session')
def session(request: Request):
    store=WorkspaceStore(DB)
    try:
        return {'token':TOKEN, 'version':'1.5.0',
                'setup_required':not bool(store.db.execute('SELECT 1 FROM team_users LIMIT 1').fetchone()),
                'user':store.current_user(request.cookies.get('gf_session',''))}
    finally: store.db.close()

@app.post('/api/auth/{operation}')
def authentication(operation: str, data: dict, request: Request):
    store=WorkspaceStore(DB)
    try:
        if operation=='setup':
            uid=store.setup(data.get('password'))
        elif operation=='login':
            uid=store.login(data.get('username'),data.get('password'),request.client.host if request.client else 'local')
        elif operation=='logout':
            import hashlib
            with store.db:
                store.db.execute('DELETE FROM team_sessions WHERE token=?',(hashlib.sha256(request.cookies.get('gf_session','').encode()).hexdigest(),))
            response=JSONResponse({'ok':True})
            response.delete_cookie('gf_session',path='/')
            return response
        elif operation=='password':
            user=store.current_user(request.cookies.get('gf_session',''))
            if not user: return JSONResponse({'error':'Entre novamente.'},401)
            row=store.db.execute('SELECT password FROM team_users WHERE id=?',(user['id'],)).fetchone()
            if not verify_password(data.get('current_password'),row['password']): raise ValueError('Senha atual inválida.')
            encoded=password_hash(data.get('password'))
            with store.db:
                store.db.execute('UPDATE team_users SET password=?,must_change=0 WHERE id=?',(encoded,user['id']))
                store.db.execute('DELETE FROM team_sessions WHERE user_id=?',(user['id'],))
            uid=user['id']
        else: return JSONResponse({'error':'Operação inválida.'},404)
        cookie=store.session(uid)
        response=JSONResponse({'ok':True,'user':store.current_user(cookie)})
        response.set_cookie('gf_session',cookie,httponly=True,samesite='strict',max_age=12*3600,path='/',secure=request.url.scheme=='https')
        return response
    except AccessError as exc: return JSONResponse({'error':str(exc)},401)
    except (ValueError,TypeError) as exc: return JSONResponse({'error':str(exc)},400)
    except sqlite3.IntegrityError: return JSONResponse({'error':'Conta já cadastrada.'},409)
    finally: store.db.close()

@app.get('/oauth/google/callback')
def google_callback(code: str = '', state: str = '', error: str = ''):
    try:
        if error or not code:
            raise ValueError('Autorização não concluída.')
        RUNTIME.finish_authorization(code, state)
        return HTMLResponse('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Grupo França</title><body style="background:#111923;color:#dde6f3;font:16px sans-serif;padding:40px"><h1>Google Calendar autorizado.</h1><p>Feche esta aba e atualize os dados na plataforma para testar a conexão.</p><a style="color:#8ab4ff" href="http://127.0.0.1:8780">Voltar à plataforma</a></body></html>')
    except ValueError:
        return HTMLResponse('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body><h1>Autorização não concluída.</h1><p>Volte à plataforma e inicie a conexão novamente. Confira o Client ID, o Client secret e o endereço de retorno cadastrado no Google.</p></body></html>', status_code=400)

@app.get('/api/state')
def state(request: Request):
    store = WorkspaceStore(DB)
    try:
        result=scoped_state(store,request.state.user)
        result.update(config=store.config(),phases=PHASES,now=now().isoformat(),
                      key_ready=bool(service.key or os.getenv('OPENAI_API_KEY')) if request.state.user['role']=='manager' else False)
        return result
    finally: store.db.close()

@app.get('/api/contact')
def contact(id: int, request: Request):
    store = WorkspaceStore(DB)
    try:
        if not store.lead(id): return JSONResponse({'error':'Contato não encontrado.'},404)
        store.require_lead(request.state.user,id)
        return {'lead':store.lead(id),'messages':store.messages(id),'summary':store.summary(id),
                'meeting':next((m for m in store.meetings() if m['lead_id']==id),None)}
    except AccessError as exc: return JSONResponse({'error':str(exc)},403)
    finally: store.db.close()

@app.post('/api/action')
def action(data: dict, request: Request):
    user=request.state.user
    if data.get('action')=='gf_automation' and data.get('enabled') is False and user['role']=='manager':
        RUNTIME.automation['enabled']=False
        return {'ok':True}
    if not service.lock.acquire(blocking=False):
        return JSONResponse({'error':'Há uma operação em andamento. Aguarde.'},409)
    store=None
    try:
        store=WorkspaceStore(DB)
        authorize(store,user,data)
        kind=data.get('action','')
        if kind=='team_management':
            return store.management(data.get('start'),data.get('end'))
        if kind.startswith('team_user_'):
            return store.manage_user(user,data)
        if kind=='team_assign_many':
            return store.assign_many(user,data.get('ids'),int(data.get('user_id',0)))
        if kind=='team_assign':
            lid=int(data.get('id',0))
            store.assign(lid,int(data.get('user_id',0)))
            store.audit(user,kind,lid,{'user_id':data['user_id']})
            return {'ok':True}
        if kind=='team_move':
            lid=int(data.get('id',0))
            if not store.lead(lid): raise ValueError('Contato não encontrado.')
            return store.move(user,lid,data.get('stage'))
        if kind=='gf_metrics':
            return store.metrics(str(data.get('start','')),str(data.get('end','')),str(data.get('source','')),
                                 None if user['role']=='manager' else store.visible_ids(user))
        if kind=='gf_outcome':
            lid=int(data.get('id',0))
            if not store.lead(lid): raise ValueError('Contato não encontrado.')
            outcome=data.get('outcome')
            if outcome not in ('open','won','lost'): raise ValueError('Resultado inválido.')
            current_stage=store.stage(store.lead(lid))
            next_stage=outcome if outcome!='open' else ('contacted' if current_stage in ('won','lost') else current_stage)
            result=store.move(user,lid,next_stage)
            store.save_profile(lid,{'reason':str(data.get('reason','')).strip()[:1000]})
            return result
        if kind in ('create','gf_import_commit') or (kind=='gf_profile' and not data.get('id')):
            owner_id=int(data.get('owner_id') or user['id'])
            if user['role']!='manager' and owner_id!=user['id']: raise AccessError('Somente o gerente pode atribuir contatos a outro usuário.')
            if not store.db.execute('SELECT 1 FROM team_users WHERE id=? AND active=1',(owner_id,)).fetchone(): raise ValueError('Selecione um responsável ativo.')
            store.request_owner_id=owner_id
        # A fixed own agent; the manager may edit its approved texts and schedule.
        if kind=='config': data={**data,'provider':'França IA'}
        if kind=='gf_profile' and user['role']!='manager':
            data={**data,'owner':user['name']}
        result=service.execute(store,data)
        if kind in ('create','gf_profile') and result.get('id'):
            lid=int(result['id'])
            if not data.get('id'): store.assign(lid,getattr(store,'request_owner_id',user['id']))
            else:
                assigned=store.db.execute('SELECT user_id FROM team_assignments WHERE lead_id=?',(lid,)).fetchone()
                if assigned:
                    row=store.db.execute('SELECT active,name FROM team_users WHERE id=?',(assigned[0],)).fetchone()
                    with store.db: store.db.execute('UPDATE lead_meta SET owner=? WHERE lead_id=?',(row['name'],lid))
        if kind=='gf_import_preview':
            with store.db: store.db.execute('INSERT INTO team_imports VALUES (?,?)',(result['batch'],user['id']))
            if user['role']!='manager':
                for row in result['rows']:
                    if row['status']=='duplicate': row['reason']='Contato duplicado na base.'
        if kind=='gf_import_commit':
            for lid in result.get('ids',[]):
                existing=store.db.execute('SELECT 1 FROM team_assignments WHERE lead_id=?',(lid,)).fetchone()
                if not existing: store.assign(lid,getattr(store,'request_owner_id',user['id']))
        lid=int(data.get('id') or result.get('id') or 0) or None
        if data.get('mail'):
            row=store.db.execute('SELECT lead_id FROM gf_mail WHERE id=?',(str(data['mail']),)).fetchone()
            if row: lid=row[0]
        if kind not in ('gf_ai_test','gf_slots','gf_ai_export','gf_import_preview'):
            store.audit(user,kind,lid,{'simulation':kind in ('send','retry')})
        with store.db:
            store.db.execute("UPDATE cadence_runs SET status='cancelled' WHERE status='active' AND lead_id IN (SELECT id FROM leads WHERE blocked=1)")
        return result
    except AccessError as exc:
        return JSONResponse({'error':str(exc)},403)
    except sqlite3.IntegrityError:
        return JSONResponse({'error':'Cadastro duplicado ou operação em conflito.'},409)
    except (ValueError,KeyError,TypeError,sqlite3.Error) as exc:
        return JSONResponse({'error':str(exc) if isinstance(exc,ValueError) else 'Não foi possível concluir a operação.'},400)
    except Exception:
        return JSONResponse({'error':'Falha na conexão externa. Confira a configuração e tente novamente.'},502)
    finally:
        if store: store.db.close()
        service.lock.release()

if DIST.exists():
    app.mount('/assets',StaticFiles(directory=DIST/'assets'),name='assets')

@app.get('/')
def home():
    if not (DIST/'index.html').exists():
        return JSONResponse({'error':'Interface não compilada. Execute configurar.bat antes de iniciar.'},503)
    return FileResponse(DIST/'index.html',headers={'Cache-Control':'no-store'})


@app.get('/api/whatsapp')
def whatsapp_connections(request: Request):
    store=WorkspaceStore(DB)
    try: return whatsapp.listing(store,request.state.user,wa_bridge)
    finally: store.db.close()

@app.post('/api/whatsapp/{op}')
def whatsapp_action(op: str, data: dict, request: Request):
    if not wa_lock.acquire(blocking=False):
        return JSONResponse({'error':'Há uma operação de WhatsApp em andamento. Aguarde.'},409)
    acquired=False
    store=None
    try:
        acquired=service.lock.acquire(blocking=False)
        if not acquired: return JSONResponse({'error':'Há uma operação em andamento. Aguarde.'},409)
        store=WorkspaceStore(DB)
        return whatsapp.operation(store,request.state.user,wa_bridge,op,data)
    except AccessError as exc: return JSONResponse({'error':str(exc)},403)
    except (ValueError,TypeError,KeyError) as exc: return JSONResponse({'error':str(exc)},400)
    except sqlite3.Error: return JSONResponse({'error':'Não foi possível salvar a operação. Atualize e confira o status.'},409)
    finally:
        if store: store.db.close()
        if acquired: service.lock.release()
        wa_lock.release()
```

## backend/team.py

```python
"""Single-manager accounts, scoped portfolios, commercial stages and actor audit."""
import hashlib
import hmac
import json
import secrets
import time
from datetime import timedelta

from .commercial import GrowthStore
from .core import stamp, now

PERMISSIONS = {
    'create': 'Cadastrar contatos', 'edit': 'Editar contatos',
    'move': 'Mover oportunidades', 'message': 'Enviar mensagens de WhatsApp',
    'book': 'Agendar reuniões', 'import': 'Importar contatos',
    'cadence': 'Executar cadências',
}
DEFAULT_PERMISSIONS = ['create', 'edit', 'move', 'message', 'book']
STAGES = {
    'new': 'Novos', 'contacted': 'Contatados', 'qualified': 'Qualificados',
    'meeting': 'Reunião', 'proposal': 'Proposta', 'won': 'Ganho', 'lost': 'Perdido',
}


class AccessError(Exception):
    pass


def password_hash(password, salt=None):
    if not isinstance(password, str) or not 10 <= len(password) <= 128:
        raise ValueError('A senha deve ter de 10 a 128 caracteres.')
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=32768, r=8, p=3, maxmem=64*1024*1024).hex()
    return salt + ':' + digest


def verify_password(password, encoded):
    try:
        return hmac.compare_digest(password_hash(password, encoded.split(':')[0]), encoded)
    except (ValueError, TypeError, AttributeError):
        return False


class TeamStore(GrowthStore):
    def __init__(self, path):
        super().__init__(path)
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS team_users (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('manager','seller')),
          active INTEGER NOT NULL DEFAULT 1, permissions TEXT NOT NULL,
          target INTEGER NOT NULL DEFAULT 0, must_change INTEGER NOT NULL DEFAULT 0,
          created TEXT NOT NULL);
        CREATE UNIQUE INDEX IF NOT EXISTS team_single_manager ON team_users(role) WHERE role='manager';
        CREATE TABLE IF NOT EXISTS team_sessions (
          token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES team_users(id),
          expires REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS team_assignments (
          lead_id INTEGER PRIMARY KEY REFERENCES leads(id), user_id INTEGER NOT NULL REFERENCES team_users(id));
        CREATE TABLE IF NOT EXISTS team_stages (
          lead_id INTEGER PRIMARY KEY REFERENCES leads(id), stage TEXT NOT NULL,
          updated TEXT NOT NULL, actor_id INTEGER NOT NULL REFERENCES team_users(id));
        CREATE TABLE IF NOT EXISTS team_audit (
          id INTEGER PRIMARY KEY, actor_id INTEGER NOT NULL REFERENCES team_users(id),
          lead_id INTEGER REFERENCES leads(id), action TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '{}', created TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS team_audit_date ON team_audit(created,actor_id);
        CREATE TABLE IF NOT EXISTS team_imports (
          batch TEXT PRIMARY KEY REFERENCES gf_imports(id), user_id INTEGER NOT NULL REFERENCES team_users(id));
        CREATE TABLE IF NOT EXISTS team_auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until REAL NOT NULL);
        ''')
        manager = self.db.execute("SELECT id FROM team_users WHERE role='manager'").fetchone()
        if manager:
            with self.db:
                self.db.execute('INSERT OR IGNORE INTO team_assignments SELECT id,? FROM leads', (manager['id'],))
                self.db.execute('INSERT OR IGNORE INTO lead_meta(lead_id,owner) SELECT id,? FROM leads', ('Igor França',))
                self.db.execute('CREATE TABLE IF NOT EXISTS team_migrations (name TEXT PRIMARY KEY)')
                if not self.db.execute("SELECT 1 FROM team_migrations WHERE name='manual_pipeline_1_5'").fetchone():
                    # Preserve the visible legacy stage once; subsequent changes are manual.
                    for lead in self.leads():
                        if self.db.execute('SELECT 1 FROM team_stages WHERE lead_id=?',(lead['id'],)).fetchone(): continue
                        outcome=self.profile(lead['id'])['outcome']
                        kinds={r[0] for r in self.db.execute("SELECT kind FROM gf_events WHERE lead_id=? AND mode='real'",(lead['id'],))}
                        stage=outcome if outcome in ('won','lost') else 'new'
                        if stage=='new':
                            if 'meeting_booked' in kinds and self.db.execute('SELECT 1 FROM meetings WHERE lead_id=? AND active=1',(lead['id'],)).fetchone(): stage='meeting'
                            elif 'qualified' in kinds: stage='qualified'
                            elif kinds & {'sent','received'}: stage='contacted'
                        self.db.execute('INSERT INTO team_stages VALUES (?,?,?,?)',(lead['id'],stage,stamp(),manager['id']))
                    self.db.execute("INSERT INTO team_migrations VALUES ('manual_pipeline_1_5')")


    def public_user(self, row):
        return {key: (json.loads(row[key]) if key == 'permissions' else row[key])
                for key in ('id','name','username','role','active','permissions','target','must_change','created')}

    def users(self):
        return [self.public_user(r) for r in self.db.execute('SELECT * FROM team_users ORDER BY role,name,id')]

    def current_user(self, token):
        hashed = hashlib.sha256(token.encode()).hexdigest()
        row = self.db.execute('''SELECT u.* FROM team_sessions s JOIN team_users u ON u.id=s.user_id
            WHERE s.token=? AND s.expires>? AND u.active=1''', (hashed, time.time())).fetchone()
        return self.public_user(row) if row else None

    def session(self, uid):
        token = secrets.token_urlsafe(40)
        with self.db:
            self.db.execute('DELETE FROM team_sessions WHERE expires<?', (time.time(),))
            self.db.execute('INSERT INTO team_sessions VALUES (?,?,?)',
                            (hashlib.sha256(token.encode()).hexdigest(), uid, time.time()+12*3600))
        return token

    def setup(self, password):
        encoded = password_hash(password)
        try:
            self.db.execute('BEGIN IMMEDIATE')
            if self.db.execute('SELECT 1 FROM team_users LIMIT 1').fetchone():
                raise ValueError('O gerente já foi cadastrado. Entre com sua conta.')
            uid = self.db.execute('INSERT INTO team_users(name,username,password,role,permissions,created) VALUES (?,?,?,?,?,?)',
                                  ('Igor França','igor',encoded,'manager',json.dumps(list(PERMISSIONS)),stamp())).lastrowid
            self.db.execute('INSERT OR IGNORE INTO team_assignments SELECT id,? FROM leads', (uid,))
            self.db.execute('INSERT OR IGNORE INTO lead_meta(lead_id,owner) SELECT id,? FROM leads', ('Igor França',))
            # One fixed agent: preserve approved conversation texts, select the own local engine.
            self.db.execute("INSERT OR REPLACE INTO settings VALUES (?,?)", ('provider',json.dumps('França IA',ensure_ascii=False)))
            self.db.commit()
            return uid
        except Exception:
            self.db.rollback()
            raise

    def login(self, username, password, remote):
        username = str(username).strip().lower()[:100]
        keys = ['ip:'+remote, 'account:'+username]
        for key in keys:
            row = self.db.execute('SELECT * FROM team_auth_attempts WHERE key=?', (key,)).fetchone()
            if row and row['count'] >= 8 and row['until'] > time.time():
                raise AccessError('Muitas tentativas. Aguarde 15 minutos.')
        row = self.db.execute('SELECT * FROM team_users WHERE username=?', (username,)).fetchone()
        if not row or not row['active'] or not verify_password(password, row['password']):
            with self.db:
                for key in keys:
                    self.db.execute('''INSERT INTO team_auth_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE
                        SET count=CASE WHEN until<? THEN 1 ELSE count+1 END, until=excluded.until''',
                        (key,time.time()+900,time.time()))
            raise AccessError('Usuário ou senha inválidos.')
        with self.db:
            for key in keys: self.db.execute('DELETE FROM team_auth_attempts WHERE key=?',(key,))
        return row['id']

    def require_lead(self, user, lid):
        if not self.lead(lid):
            raise ValueError('Contato não encontrado.')
        if user['role'] != 'manager' and not self.db.execute('SELECT 1 FROM team_assignments WHERE lead_id=? AND user_id=?', (lid,user['id'])).fetchone():
            raise AccessError('Este contato não pertence à sua carteira.')

    def visible_ids(self, user):
        if user['role'] == 'manager':
            return {r[0] for r in self.db.execute('SELECT id FROM leads')}
        return {r[0] for r in self.db.execute('SELECT lead_id FROM team_assignments WHERE user_id=?',(user['id'],))}

    def assign(self, lid, uid):
        row = self.db.execute('SELECT * FROM team_users WHERE id=? AND active=1', (uid,)).fetchone()
        if not row or not self.lead(lid):
            raise ValueError('Selecione um contato e um usuário ativo.')
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO team_assignments VALUES (?,?)',(lid,uid))
            self.db.execute('INSERT OR IGNORE INTO lead_meta(lead_id) VALUES (?)',(lid,))
            self.db.execute('UPDATE lead_meta SET owner=? WHERE lead_id=?',(row['name'],lid))

    def insert_profile(self, row):
        lid=super().insert_profile(row)
        uid=getattr(self,'request_owner_id',None)
        if uid is not None:
            owner=self.db.execute('SELECT name FROM team_users WHERE id=? AND active=1',(uid,)).fetchone()
            if not owner: raise ValueError('Responsável indisponível.')
            # Participate in the caller's transaction, including the CSV batch.
            self.db.execute('INSERT INTO team_assignments VALUES (?,?)',(lid,uid))
            self.db.execute('UPDATE lead_meta SET owner=? WHERE lead_id=?',(owner['name'],lid))
        return lid

    def assign_many(self, user, ids, uid):
        if user['role']!='manager': raise AccessError('Somente o gerente pode distribuir contatos.')
        if not isinstance(ids,list) or not 1<=len(ids)<=500 or any(type(lid) is not int or lid<1 for lid in ids):
            raise ValueError('Selecione de 1 a 500 contatos válidos.')
        ids=list(dict.fromkeys(ids))
        owner=self.db.execute('SELECT name FROM team_users WHERE id=? AND active=1',(uid,)).fetchone()
        if not owner or any(not self.lead(lid) for lid in ids): raise ValueError('Confira os contatos e o responsável selecionados.')
        changed=0
        with self.db:
            for lid in ids:
                previous=self.db.execute('SELECT user_id FROM team_assignments WHERE lead_id=?',(lid,)).fetchone()
                if previous and previous[0]==uid: continue
                self.db.execute('INSERT OR REPLACE INTO team_assignments VALUES (?,?)',(lid,uid))
                self.db.execute('INSERT OR IGNORE INTO lead_meta(lead_id) VALUES (?)',(lid,))
                self.db.execute('UPDATE lead_meta SET owner=? WHERE lead_id=?',(owner['name'],lid))
                self.db.execute('INSERT INTO team_audit(actor_id,lead_id,action,detail,created) VALUES (?,?,?,?,?)',
                    (user['id'],lid,'team_assign',json.dumps({'user_id':uid,'batch':True}),stamp()))
                changed+=1
        return {'ok':True,'changed':changed}

    def stage(self, lead):
        saved = self.db.execute('SELECT stage FROM team_stages WHERE lead_id=?',(lead['id'],)).fetchone()
        outcome = self.profile(lead['id'])['outcome']
        if outcome in ('won','lost'): return outcome
        if saved: return saved['stage']
        # Voice qualification is deferred; WhatsApp events do not move cards.
        return 'new'

    def move(self, user, lid, stage):
        lead = self.lead(lid)
        if stage not in STAGES: raise ValueError('Etapa inválida.')
        if lead['blocked']: raise ValueError('Contato bloqueado. O pedido de não contato permanece ativo.')
        previous = self.stage(lead)
        if stage == previous: return {'ok':True, 'changed':False}
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO team_stages VALUES (?,?,?,?)',(lid,stage,stamp(),user['id']))
            self.db.execute('INSERT OR IGNORE INTO gf_profiles(lead_id) VALUES (?)',(lid,))
            self.db.execute('UPDATE gf_profiles SET outcome=? WHERE lead_id=?',(stage if stage in ('won','lost') else 'open',lid))
            self.db.execute('UPDATE leads SET updated=? WHERE id=?',(stamp(),lid))
            self.db.execute('INSERT INTO team_audit(actor_id,lead_id,action,detail,created) VALUES (?,?,?,?,?)',
                            (user['id'],lid,'team_move',json.dumps({'from':previous,'to':stage}),stamp()))
            if stage in ('won','qualified'):
                self.db.execute('INSERT INTO gf_events(lead_id,kind,mode,acquisition,created) VALUES (?,?,?,?,?)',
                                (lid,stage,'manual',self.profile(lid)['source'] or lead['origin'],stamp()))
        # Moving a card never creates a meeting or sends a message.
        return {'ok':True,'changed':True}

    def audit(self, user, action, lid=None, detail=None):
        with self.db:
            self.db.execute('INSERT INTO team_audit(actor_id,lead_id,action,detail,created) VALUES (?,?,?,?,?)',
                            (user['id'],lid,action,json.dumps(detail or {},ensure_ascii=False),stamp()))

    def team_state(self, user):
        ids = self.visible_ids(user)
        leads = [l for l in self.leads() if l['id'] in ids]
        assignments = {str(r['lead_id']):r['user_id'] for r in self.db.execute('SELECT * FROM team_assignments') if r['lead_id'] in ids}
        return {'stages':{str(l['id']):self.stage(l) for l in leads},'stage_labels':STAGES,
                'assignments':assignments,'permission_labels':PERMISSIONS,
                'users':self.users() if user['role']=='manager' else [user]}

    def management(self, start, end):
        from datetime import datetime
        try:
            lower = datetime.fromisoformat(str(start)).date().isoformat()
            upper = (datetime.fromisoformat(str(end)).date()+timedelta(days=1)).isoformat()
            if lower >= upper: raise ValueError()
        except (ValueError,TypeError): raise ValueError('Informe um período válido.') from None
        rows=[]
        for user in self.users():
            uid=user['id']
            actions=[dict(r) for r in self.db.execute('SELECT * FROM team_audit WHERE actor_id=? AND created>=? AND created<? ORDER BY id',(uid,lower,upper))]
            carteira=[self.lead(r[0]) for r in self.db.execute('SELECT lead_id FROM team_assignments WHERE user_id=?',(uid,))]
            moves=[r for r in actions if r['action']=='team_move']
            wins=[]
            for lead in carteira:
                if self.stage(lead)!='won': continue
                last=self.db.execute("SELECT * FROM team_audit WHERE lead_id=? AND action='team_move' ORDER BY id DESC LIMIT 1",(lead['id'],)).fetchone()
                if last and last['actor_id']==uid and lower<=last['created']<upper and json.loads(last['detail']).get('to')=='won': wins.append(lead['id'])
            rows.append({'user':user,'leads':len(carteira),'wins':len(wins),
                         'activities':len(actions),'moves':len(moves),
                         'contacts_worked':len({r['lead_id'] for r in actions if r['lead_id'] and r['action'] not in ('team_assign','send','retry','wa_test')}),
                         'overdue':sum(bool(l['followup'] and l['followup']<stamp() and not l['blocked']) for l in carteira),
                         'meetings':self.db.execute('''SELECT count(*) FROM gf_events e JOIN team_assignments a ON a.lead_id=e.lead_id
                             WHERE a.user_id=? AND e.mode='real' AND e.kind='meeting_booked' AND e.created>=? AND e.created<?''',(uid,lower,upper)).fetchone()[0],
                         'last_activity':actions[-1]['created'] if actions else '',
                         'conversion':round(100*len(wins)/len(carteira),1) if carteira else 0})
        rows.sort(key=lambda r:(-r['wins'],-r['contacts_worked'],r['user']['name']))
        audit=[dict(r) for r in self.db.execute('''SELECT a.id,a.created,a.action,a.lead_id,a.detail,u.name actor,l.name contact
            FROM team_audit a JOIN team_users u ON u.id=a.actor_id LEFT JOIN leads l ON l.id=a.lead_id
            WHERE a.created>=? AND a.created<? ORDER BY a.id DESC LIMIT 100''',(lower,upper))]
        return {'rows':rows,'audit':audit,'start':lower,'end':end}

    def manage_user(self, actor, data):
        action=data['action']
        if action=='team_user_create':
            name=str(data.get('name','')).strip()
            username=str(data.get('username','')).strip().lower()
            if not name or len(name)>100 or not username.isascii() or not 3<=len(username)<=60 or not all(c.isalnum() or c in '._-' for c in username):
                raise ValueError('Informe nome e usuário com 3 a 60 letras, números, ponto, hífen ou sublinhado.')
            encoded=password_hash(data.get('password'))
            permissions=data.get('permissions',DEFAULT_PERMISSIONS)
            if not isinstance(permissions,list) or any(p not in PERMISSIONS for p in permissions): raise ValueError('Permissões inválidas.')
            with self.db:
                uid=self.db.execute('INSERT INTO team_users(name,username,password,role,permissions,must_change,created) VALUES (?,?,?,?,?,1,?)',
                                    (name,username,encoded,'seller',json.dumps(permissions),stamp())).lastrowid
            self.audit(actor,action,detail={'user_id':uid})
            return {'ok':True,'id':uid}
        uid=int(data.get('user_id',0))
        target=self.db.execute('SELECT * FROM team_users WHERE id=?',(uid,)).fetchone()
        if not target or target['role']=='manager': raise ValueError('A conta do gerente não pode ser alterada por esta ação.')
        if action=='team_user_update':
            permissions=data.get('permissions',json.loads(target['permissions']))
            active=data.get('active',bool(target['active']))
            goal=int(data.get('target',target['target']))
            if not isinstance(active,bool) or not isinstance(permissions,list) or any(p not in PERMISSIONS for p in permissions) or not 0<=goal<=100000: raise ValueError('Confira permissões e meta mensal.')
            with self.db:
                self.db.execute('UPDATE team_users SET active=?,permissions=?,target=? WHERE id=?',(int(active),json.dumps(permissions),goal,uid))
                self.db.execute('DELETE FROM team_sessions WHERE user_id=?',(uid,))
        elif action=='team_user_password':
            encoded=password_hash(data.get('password'))
            with self.db:
                self.db.execute('UPDATE team_users SET password=?,must_change=1 WHERE id=?',(encoded,uid))
                self.db.execute('DELETE FROM team_sessions WHERE user_id=?',(uid,))
        else: raise ValueError('Ação de usuário inválida.')
        self.audit(actor,action,detail={'user_id':uid})
        return {'ok':True}


def allowed(user, permission):
    return user['role']=='manager' or permission in user['permissions']


# Explicit allowlist. Every seller operation has a permission and object ownership check.
SELLER_ACTIONS={
    'create':'create','gf_profile':'edit','profile':'edit','notes':'edit','block':'edit',
    'pause':'message','send':'message','retry':'message','gf_mail_draft':'message',
    'gf_mail_send':'message','gf_mail_cancel':'message','gf_start_real':'message',
    'gf_slots':'book','gf_book':'book','cancel':'book','team_move':'move','gf_outcome':'move',
    'gf_import_preview':'import','gf_import_commit':'import',
    'cadence_assign':'cadence','cadence_next':'cadence','cadence_cancel':'cadence','gf_metrics':None,
}


def authorize(store,user,data):
    action=data.get('action')
    if not isinstance(action,str): raise ValueError('Ação inválida.')
    if user['role']=='manager': return
    if action not in SELLER_ACTIONS: raise AccessError('Esta ação é exclusiva do gerente.')
    permission='create' if action=='gf_profile' and not data.get('id') else SELLER_ACTIONS[action]
    if permission and not allowed(user,permission): raise AccessError('Seu perfil não tem permissão para esta ação.')
    if data.get('id') or action in ('team_move','gf_outcome','notes','pause','block','send','retry','profile','gf_book','gf_slots','cancel','gf_start_real','gf_mail_draft','cadence_assign','cadence_next','cadence_cancel'):
        store.require_lead(user,int(data.get('id') or 0))
    if action in ('gf_mail_send','gf_mail_cancel'):
        row=store.db.execute('SELECT lead_id FROM gf_mail WHERE id=?',(str(data.get('mail','')),)).fetchone()
        if not row: raise ValueError('Mensagem não encontrada.')
        store.require_lead(user,row['lead_id'])
    if action=='gf_import_commit' and not store.db.execute('SELECT 1 FROM team_imports WHERE batch=? AND user_id=?',(str(data.get('batch','')),user['id'])).fetchone():
        raise AccessError('Esta importação pertence a outro usuário.')


def scoped_state(store,user):
    ids=store.visible_ids(user)
    workspace=store.workspace()
    workspace['meta']={k:v for k,v in workspace['meta'].items() if int(k) in ids}
    workspace['history']=[r for r in workspace['history'] if r['lead_id'] in ids]
    workspace['runs']=[r for r in workspace['runs'] if r['lead_id'] in ids]
    if user['role']!='manager': workspace['usage']=[]
    commercial=store.snapshot()
    commercial['profiles']={k:v for k,v in commercial['profiles'].items() if int(k) in ids}
    commercial['real_lead_ids']=[i for i in commercial['real_lead_ids'] if i in ids]
    commercial['mail']=[m for m in commercial['mail'] if m['lead_id'] in ids]
    meetings=[m for m in store.meetings() if m['lead_id'] in ids]
    mids={m['id'] for m in meetings}
    commercial['calendar']=[m for m in commercial['calendar'] if m['meeting_id'] in mids]
    if user['role']!='manager':
        commercial.update(examples=[],knowledge=[],model=None,connections={'values':{},'configured':{},'checked':{}})
    return {'user':user,'leads':[l for l in store.leads() if l['id'] in ids], 'meetings':meetings,
            'workspace':workspace,'commercial':commercial,'team':store.team_state(user)}
```

## backend/commercial.py

```python
"""Commercial extension: additive migrations, imports, real operations and own AI."""
import csv
import email
import io
import json
import re
import sqlite3
import uuid
from datetime import datetime, timedelta
from email.policy import default

from . import franca_ai as ai
from .connectors import Credentials, GoogleCalendar, Mail, RemoteError, email_address, mail_body
from .core import PHASES, Store, TZ, contact_key, fmt, norm, now, stamp
from .service import CommercialService
from .workspace import WorkspaceStore

RUNTIME = Credentials()
PHASES.update(goal='Objetivo comercial', timing='Prazo da melhoria')
PROFILE_FIELDS = ('email', 'segment', 'source', 'goal', 'timing', 'qualified', 'outcome', 'reason')
ALIASES = {
    'name': ('nome', 'nome do contato', 'contato nome', 'name'),
    'company': ('empresa', 'nome empresa', 'nome da empresa', 'razao social', 'company'),
    'contact': ('contato', 'telefone', 'telefone / contato', 'whatsapp', 'celular', 'phone'),
    'email': ('email', 'e-mail', 'correio'),
    'segment': ('segmento', 'nicho', 'segment'),
    'source': ('fonte', 'fonte de captacao', 'source'),
    'origin': ('origem', 'origin'), 'target': ('publico', 'perfil', 'target'),
    'owner': ('responsavel', 'owner'), 'tags': ('tags', 'etiquetas'),
}


def identity(value):
    value = str(value).strip()
    if '@' in value:
        return 'email:' + email_address(value)
    digits = re.sub(r'\D', '', value)
    if len(digits) in (10, 11):
        digits = '55' + digits
    return 'phone:' + digits if len(digits) >= 8 else ''


class GrowthStore(WorkspaceStore):
    def __init__(self, path):
        super().__init__(path)
        self.credentials = RUNTIME
        self._busy_cache = None
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS gf_profiles (
          lead_id INTEGER PRIMARY KEY REFERENCES leads(id), email TEXT NOT NULL DEFAULT '',
          segment TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', goal TEXT NOT NULL DEFAULT '',
          timing TEXT NOT NULL DEFAULT '', qualified INTEGER NOT NULL DEFAULT 0,
          outcome TEXT NOT NULL DEFAULT 'open', reason TEXT NOT NULL DEFAULT '');
        CREATE TABLE IF NOT EXISTS gf_events (
          id INTEGER PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES leads(id), kind TEXT NOT NULL,
          mode TEXT NOT NULL, acquisition TEXT NOT NULL, created TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS gf_events_date ON gf_events(created,kind,mode);
        CREATE TABLE IF NOT EXISTS gf_imports (
          id TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'preview',
          created TEXT NOT NULL, result TEXT NOT NULL DEFAULT '{}');
        CREATE TABLE IF NOT EXISTS gf_examples (
          id INTEGER PRIMARY KEY, text TEXT NOT NULL, label TEXT NOT NULL, UNIQUE(text,label));
        CREATE TABLE IF NOT EXISTS gf_models (
          id INTEGER PRIMARY KEY, examples TEXT NOT NULL, created TEXT NOT NULL, evaluation TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS gf_knowledge (
          id INTEGER PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS gf_mail (
          id TEXT PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES leads(id), direction TEXT NOT NULL,
          recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, mode TEXT NOT NULL,
          status TEXT NOT NULL, error TEXT NOT NULL DEFAULT '', external_id TEXT NOT NULL UNIQUE,
          reply_to TEXT NOT NULL DEFAULT '', based_on TEXT NOT NULL DEFAULT '', plan TEXT NOT NULL DEFAULT '{}',
          applied INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL, updated TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS gf_receipts (
          account TEXT NOT NULL, validity TEXT NOT NULL, uid INTEGER NOT NULL,
          PRIMARY KEY(account,validity,uid));
        CREATE TABLE IF NOT EXISTS gf_cursors (
          account TEXT PRIMARY KEY, validity TEXT NOT NULL, uid INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS gf_calendar (
          meeting_id INTEGER PRIMARY KEY REFERENCES meetings(id), event_id TEXT NOT NULL UNIQUE,
          operation TEXT NOT NULL DEFAULT 'upsert', status TEXT NOT NULL DEFAULT 'pending',
          attendee TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
          updated TEXT NOT NULL, calendar_id TEXT NOT NULL DEFAULT '');
        CREATE TABLE IF NOT EXISTS gf_system (key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS gf_ready (lead_id INTEGER PRIMARY KEY REFERENCES leads(id));
        CREATE TABLE IF NOT EXISTS gf_attempts (id INTEGER PRIMARY KEY, mail_id TEXT NOT NULL REFERENCES gf_mail(id), created TEXT NOT NULL);
        ''')
        with self.db:
            self.db.execute('INSERT OR IGNORE INTO gf_system VALUES (?,?)', ('installation', uuid.uuid4().hex))
            if not self.db.execute('SELECT id FROM gf_knowledge LIMIT 1').fetchone():
                self.db.executemany('INSERT INTO gf_knowledge(question,answer) VALUES (?,?)', [
                    ('serviços marketing comercial aquisição clientes grupo frança', 'O Grupo França estrutura o crescimento comercial com consultoria, marketing e execução comercial. O Igor avalia o cenário para definir o escopo.'),
                    ('preço valor custo orçamento quanto custa', 'O escopo e os valores são definidos pelo Igor conforme a necessidade da empresa. Não há preço fixo aprovado nesta base.'),
                    ('garantia resultados cases prazo retorno', 'Não prometemos resultados garantidos. O Igor pode avaliar os objetivos e os limites do trabalho com você.')])

    def config(self):
        config = super().config()
        if not self.db.execute("SELECT 1 FROM settings WHERE key='provider'").fetchone():
            config['provider'] = 'França IA'
        return config

    def profile(self, lid):
        row = self.db.execute('SELECT * FROM gf_profiles WHERE lead_id=?', (lid,)).fetchone()
        result = {key: '' for key in PROFILE_FIELDS}
        result.update(qualified=0, outcome='open', lead_id=lid)
        if row:
            result.update(dict(row))
        return result

    def save_profile(self, lid, values):
        clean = {key: values[key] for key in PROFILE_FIELDS if key in values}
        if clean:
            with self.db:
                self.db.execute('INSERT OR IGNORE INTO gf_profiles(lead_id) VALUES (?)', (lid,))
                self.db.execute('UPDATE gf_profiles SET ' + ','.join(key + '=?' for key in clean) + ' WHERE lead_id=?', [*clean.values(), lid])

    def event(self, lid, kind, mode):
        source = self.profile(lid)['source'] or self.lead(lid)['origin']
        with self.db:
            self.db.execute('INSERT INTO gf_events(lead_id,kind,mode,acquisition,created) VALUES (?,?,?,?,?)',
                            (lid, kind, mode, source, stamp()))

    def stop_contact(self, lid):
        self.update(lid, blocked=1, paused=1, phase='stopped', followup='')
        with self.db:
            self.db.execute("UPDATE cadence_runs SET status='cancelled' WHERE lead_id=? AND status='active'", (lid,))
            self.db.execute("UPDATE gf_mail SET status='cancelled',error='Contato bloqueado',updated=? WHERE lead_id=? AND status IN ('draft','failed')", (stamp(), lid))

    def duplicate(self, row, exclude=0):
        keys = {identity(row.get(key, '')) for key in ('contact', 'email')} - {''}
        for lead in self.leads():
            if lead['id'] == exclude:
                continue
            info = self.profile(lead['id'])
            if keys & ({identity(lead['contact']), identity(info['email'])} - {''}):
                return lead['id']
            if not keys and not (lead['contact'] or info['email']) and norm(row.get('company', '')) and norm(row.get('company', '')) == norm(lead['company']) and norm(row.get('name', '')) == norm(lead['name']):
                return lead['id']
        return None

    def validate_profile(self, values):
        clean = {key: str(values.get(key, '')).strip() for key in ALIASES}
        if not (clean['name'] or clean['company']):
            raise ValueError('Informe o nome ou a empresa.')
        if any(len(value) > (300 if key == 'tags' else 160) for key, value in clean.items()):
            raise ValueError('Campos de cadastro excedem o tamanho permitido.')
        clean['origin'] = clean['origin'].capitalize() or 'Outbound'
        clean['target'] = clean['target'].upper() or 'Ambos'
        if clean['target'] == 'AMBOS':
            clean['target'] = 'Ambos'
        if clean['origin'] not in ('Inbound', 'Outbound') or clean['target'] not in ('B2B', 'B2C', 'Ambos'):
            raise ValueError('Confira Origem (Inbound/Outbound) e Público (B2B/B2C/Ambos).')
        if clean['email']:
            clean['email'] = email_address(clean['email'])
        elif '@' in clean['contact']:
            clean['email'] = email_address(clean['contact'])
        if clean['contact'] and not identity(clean['contact']):
            raise ValueError('Informe um telefone com DDD ou um e-mail no campo de contato.')
        clean['owner'] = clean['owner'] or 'Igor França'
        return clean

    def insert_profile(self, row):
        cursor = self.db.execute('''INSERT INTO leads(name,company,contact,contact_key,origin,target,phase,created,updated)
          VALUES (?,?,?,?,?,?,?,?,?)''', (row['name'], row['company'], row['contact'] or row['email'],
          contact_key(row['contact'] or row['email']), row['origin'], row['target'],
          'opening' if row['origin'] == 'Outbound' else 'need', stamp(), stamp()))
        lid = cursor.lastrowid
        self.db.execute('INSERT INTO lead_meta(lead_id,tags,owner) VALUES (?,?,?)', (lid, row['tags'], row['owner']))
        self.db.execute('INSERT INTO gf_profiles(lead_id,email,segment,source) VALUES (?,?,?,?)', (lid, row['email'], row['segment'], row['source']))
        self.db.execute('INSERT INTO messages(lead_id,role,text,created,provider) VALUES (?,?,?,?,?)',
                        (lid, 'assistant', self.config()[row['origin'].lower()], stamp(), 'Rascunho de abordagem · não enviado'))
        return lid

    def import_preview(self, data):
        text = str(data.get('csv', '')).lstrip('\ufeff')
        if not text.strip() or len(text) > 800000:
            raise ValueError('Envie um CSV UTF-8 de até 800 mil caracteres e 500 contatos.')
        try:
            dialect = csv.Sniffer().sniff(text[:12000], delimiters=';,\t')
            reader = csv.DictReader(io.StringIO(text), dialect=dialect)
            headers = reader.fieldnames or []
            if len(headers) != len(set(headers)) or not headers:
                raise ValueError('Cabeçalhos vazios ou repetidos.')
            mapping = data.get('mapping') or {key: next((h for h in headers if norm(h) in names), '') for key, names in ALIASES.items()}
            rows, seen = [], set()
            for number, raw in enumerate(reader, 2):
                if number > 501:
                    raise ValueError('Divida o arquivo em lotes de até 500 contatos.')
                if not any(str(value or '').strip() for value in raw.values()):
                    continue
                row = {key: raw.get(mapping.get(key), '') or '' for key in ALIASES}
                item = {'line': number, 'row': row, 'status': 'ready', 'reason': ''}
                try:
                    row = self.validate_profile(row)
                    item['row'] = row
                    keys = {identity(row['contact']), identity(row['email'])} - {''}
                    fallback = 'name:' + norm(row['company'] + '|' + row['name'])
                    used = keys or {fallback}
                    duplicate = self.duplicate(row)
                    if duplicate or used & seen:
                        item.update(status='duplicate', reason=f'Contato já cadastrado (ID {duplicate}).' if duplicate else 'Repetido neste arquivo.')
                    seen.update(used)
                except ValueError as exc:
                    item.update(status='invalid', reason=str(exc))
                rows.append(item)
        except csv.Error:
            raise ValueError('CSV inválido. Use cabeçalhos e separador vírgula, ponto e vírgula ou tabulação.') from None
        if not rows:
            raise ValueError('O arquivo não contém contatos.')
        batch = uuid.uuid4().hex
        with self.db:
            self.db.execute('INSERT INTO gf_imports(id,payload,created) VALUES (?,?,?)', (batch, json.dumps(rows, ensure_ascii=False), stamp()))
        return {'batch': batch, 'headers': headers, 'mapping': mapping, 'rows': rows}

    def import_commit(self, batch):
        try:
            self.db.execute('BEGIN IMMEDIATE')
            record = self.db.execute('SELECT * FROM gf_imports WHERE id=?', (batch,)).fetchone()
            if not record:
                raise ValueError('Prévia não encontrada. Analise o arquivo novamente.')
            if record['status'] == 'done':
                self.db.commit()
                return json.loads(record['result'])
            result = {'created': 0, 'skipped': 0, 'ids': []}
            for item in json.loads(record['payload']):
                if item['status'] != 'ready' or self.duplicate(item['row']):
                    result['skipped'] += 1
                    continue
                result['ids'].append(self.insert_profile(item['row']))
                result['created'] += 1
            self.db.execute("UPDATE gf_imports SET status='done',result=? WHERE id=?", (json.dumps(result), batch))
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise

    def calendar(self):
        return GoogleCalendar(self.credentials)

    def validate_slot(self, dt, config, lid=None):
        Store.validate_slot(self, dt, config, lid)
        if self.credentials.ready('google'):
            if self._busy_cache is None:
                current = self.db.execute('SELECT c.event_id FROM gf_calendar c JOIN meetings m ON m.id=c.meeting_id WHERE m.lead_id=? AND m.active=1', (lid or -1,)).fetchone()
                busy = self.calendar().busy(dt, dt + timedelta(minutes=30), current['event_id'] if current else '')
            else:
                busy = self._busy_cache
            if any(start < dt + timedelta(minutes=30) and end > dt for start, end in busy):
                raise ValueError('Este horário está ocupado no Google Calendar.')

    def slots(self, config, lid):
        try:
            if self.credentials.ready('google'):
                current = self.db.execute('SELECT c.event_id FROM gf_calendar c JOIN meetings m ON m.id=c.meeting_id WHERE m.lead_id=? AND m.active=1', (lid,)).fetchone()
                self._busy_cache = self.calendar().busy(now(), now() + timedelta(days=16), current['event_id'] if current else '')
            return Store.slots(self, config, lid)
        finally:
            self._busy_cache = None

    def reserve(self, lid, value, config, source='test', attendee=''):
        # External availability is read before the SQLite transaction, then local conflicts are rechecked inside it.
        dt = datetime.fromisoformat(value)
        same = self.db.execute('SELECT id FROM meetings WHERE lead_id=? AND active=1 AND start=?', (lid, value)).fetchone()
        if same:
            link = self.db.execute('SELECT * FROM gf_calendar WHERE meeting_id=?', (same['id'],)).fetchone()
            if source != 'real' or (link and link['status'] != 'local_test'):
                if source == 'real' and link and link['attendee'] != attendee:
                    with self.db:
                        self.db.execute("UPDATE gf_calendar SET attendee=?,status='pending',updated=? WHERE meeting_id=?", (attendee, stamp(), same['id']))
                return
        self.validate_slot(dt, config, lid)
        try:
            self.db.execute('BEGIN IMMEDIATE')
            Store.validate_slot(self, dt, config, lid)
            self.db.execute("UPDATE gf_calendar SET operation='cancel',status='pending',updated=? WHERE status<>'local_test' AND meeting_id IN (SELECT id FROM meetings WHERE lead_id=? AND active=1)", (stamp(), lid))
            self.db.execute('UPDATE meetings SET active=0 WHERE lead_id=?', (lid,))
            meeting = self.db.execute('INSERT INTO meetings(lead_id,start,end) VALUES (?,?,?)', (lid, value, (dt + timedelta(minutes=30)).isoformat())).lastrowid
            self.db.execute('INSERT INTO gf_calendar(meeting_id,event_id,attendee,updated,calendar_id,status) VALUES (?,?,?,?,?,?)',
                            (meeting, 'gf' + uuid.uuid4().hex, attendee, stamp(), self.credentials.get('GF_GOOGLE_CALENDAR_ID', 'primary') if self.credentials.ready('google') else '', 'pending' if source=='real' else 'local_test'))
            self.db.execute("UPDATE leads SET phase='booked',proposed=?,followup='',updated=? WHERE id=?", (value, stamp(), lid))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.event(lid, 'meeting_booked', source)

    def cancel_meetings(self, lid):
        with self.db:
            self.db.execute("UPDATE gf_calendar SET operation='cancel',status='pending',updated=? WHERE status<>'local_test' AND meeting_id IN (SELECT id FROM meetings WHERE lead_id=? AND active=1)", (stamp(), lid))
            self.db.execute('UPDATE meetings SET active=0 WHERE lead_id=?', (lid,))
        self.event(lid, 'meeting_cancelled', 'real')

    def sync_calendar(self):
        if not self.credentials.ready('google'):
            raise ValueError('Configure a autorização Google antes de sincronizar.')
        count, errors = 0, []
        installation = self.db.execute("SELECT value FROM gf_system WHERE key='installation'").fetchone()[0]
        current_calendar = self.credentials.get('GF_GOOGLE_CALENDAR_ID', 'primary')
        rows = self.db.execute("SELECT c.*,m.lead_id,m.start,m.end FROM gf_calendar c JOIN meetings m ON m.id=c.meeting_id WHERE c.status IN ('pending','error') ORDER BY CASE c.operation WHEN 'cancel' THEN 0 ELSE 1 END,c.meeting_id").fetchall()
        for record in rows:
            row = dict(record)
            try:
                if row['calendar_id'] and row['calendar_id'] != current_calendar:
                    raise ValueError('A reserva pertence a outra agenda. Reconecte a agenda original antes de sincronizar.')
                if row['operation'] != 'cancel':
                    self.validate_slot(datetime.fromisoformat(row['start']), self.config(), row['lead_id'])
                result = self.calendar().sync(row, self.lead(row['lead_id']), installation)
                with self.db:
                    self.db.execute("UPDATE gf_calendar SET status='synced',error='',link=?,updated=?,calendar_id=? WHERE meeting_id=?",
                                    (result.get('htmlLink', ''), stamp(), current_calendar, row['meeting_id']))
                count += 1
            except ValueError as exc:
                errors.append(str(exc))
                with self.db:
                    self.db.execute("UPDATE gf_calendar SET status='error',error=?,updated=? WHERE meeting_id=?", (str(exc), stamp(), row['meeting_id']))
        return {'synced': count, 'errors': errors}

    def summary(self, lid):
        info = self.profile(lid)
        original = Store.summary(self, lid).split('Sem sincronização externa;')[0]
        status = self.db.execute('SELECT status,error FROM gf_calendar WHERE meeting_id IN (SELECT id FROM meetings WHERE lead_id=? AND active=1)', (lid,)).fetchone()
        return original + f"\nOBJETIVO RELATADO\n{info['goal'] or 'Não informado'}\nPRAZO RELATADO\n{info['timing'] or 'Não informado'}\nAGENDA EXTERNA\n" + (status['status'] if status else 'Sem sincronização registrada')

    def reconcile_calendar(self):
        if not self.credentials.ready('google'):
            raise ValueError('Configure a autorização Google antes de reconciliar.')
        updated, errors = 0, []
        rows = self.db.execute("SELECT c.*,m.lead_id,m.start,m.end FROM gf_calendar c JOIN meetings m ON m.id=c.meeting_id WHERE m.active=1 AND c.status='synced' AND c.operation='upsert'").fetchall()
        calendar_id = self.credentials.get('GF_GOOGLE_CALENDAR_ID', 'primary')
        for row in rows:
            if row['calendar_id'] != calendar_id:
                continue
            try:
                try:
                    remote = self.calendar().request('/events/' + row['event_id'])
                except RemoteError as exc:
                    if exc.status not in (404, 410):
                        raise
                    remote = {'status': 'cancelled'}
                if remote.get('status') == 'cancelled':
                    with self.db:
                        self.db.execute('UPDATE meetings SET active=0 WHERE id=?', (row['meeting_id'],))
                        self.db.execute("UPDATE gf_calendar SET status='remote_cancelled',updated=? WHERE meeting_id=?", (stamp(), row['meeting_id']))
                    store_lead = self.lead(row['lead_id'])
                    self.update(row['lead_id'], phase='stopped' if store_lead['blocked'] else 'invite', proposed='', offered='[]')
                    self.event(row['lead_id'], 'meeting_cancelled', 'real')
                    updated += 1
                    continue
                def local(part):
                    if 'dateTime' not in part:
                        raise ValueError('O evento foi convertido em dia inteiro. Ajuste o horário no Google antes de reconciliar.')
                    return datetime.fromisoformat(part['dateTime'].replace('Z', '+00:00')).astimezone(TZ).replace(tzinfo=None)
                start, end = local(remote['start']), local(remote['end'])
                if start.isoformat() == row['start'] and end.isoformat() == row['end']:
                    continue
                if end - start != timedelta(minutes=30):
                    raise ValueError('O evento externo deixou de ter 30 minutos. Ajuste a duração no Google.')
                Store.validate_slot(self, start, self.config(), row['lead_id'])
                with self.db:
                    self.db.execute('UPDATE meetings SET start=?,end=? WHERE id=?', (start.isoformat(), end.isoformat(), row['meeting_id']))
                self.update(row['lead_id'], proposed=start.isoformat())
                updated += 1
            except (ValueError, KeyError) as exc:
                errors.append(str(exc))
        return {'updated': updated, 'errors': errors}

    def snapshot(self):
        model = self.db.execute('SELECT id,created,evaluation FROM gf_models ORDER BY id DESC LIMIT 1').fetchone()
        return {'profiles': {str(r['lead_id']): dict(r) for r in self.db.execute('SELECT * FROM gf_profiles')},
                'real_lead_ids': [r[0] for r in self.db.execute("SELECT lead_id FROM gf_ready UNION SELECT lead_id FROM gf_mail WHERE direction='in' OR status IN ('sent','unknown','sending')")],
                'mail': [dict(r) for r in self.db.execute('SELECT id,lead_id,direction,recipient,subject,body,mode,status,error,external_id,created,updated FROM gf_mail ORDER BY created DESC,id DESC LIMIT 300')],
                'calendar': [dict(r) for r in self.db.execute('SELECT * FROM gf_calendar ORDER BY meeting_id DESC LIMIT 500')],
                'knowledge': [dict(r) for r in self.db.execute('SELECT * FROM gf_knowledge WHERE active=1')],
                'examples': [dict(r) for r in self.db.execute('SELECT * FROM gf_examples ORDER BY id DESC LIMIT 200')],
                'model': dict(model) if model else None, 'connections': self.credentials.public()}

    def metrics(self, start, end, source='', lead_ids=None):
        try:
            lower = datetime.fromisoformat(start).date().isoformat()
            upper = (datetime.fromisoformat(end).date() + timedelta(days=1)).isoformat()
            if lower >= upper:
                raise ValueError()
        except ValueError:
            raise ValueError('Informe um período de datas válido.') from None
        params = [lower, upper]
        sql = "SELECT * FROM gf_events WHERE (mode='real' OR (mode='manual' AND kind IN ('won','qualified'))) AND created>=? AND created<?"
        if source:
            sql += ' AND acquisition=?'
            params.append(source)
        rows = [dict(r) for r in self.db.execute(sql, params) if (lead_ids is None or r['lead_id'] in lead_ids) and (r['kind']!='won' or self.profile(r['lead_id'])['outcome']=='won')]
        counts = {kind: len({r['lead_id'] for r in rows if r['kind'] == kind}) for kind in ('sent', 'received', 'qualified', 'meeting_booked', 'won')}
        first = {}
        for row in rows:
            if row['kind'] == 'sent':
                key = (row['created'], row['id'])
                first[row['lead_id']] = min(key, first.get(row['lead_id'], key))
        cohort = {kind: len({r['lead_id'] for r in rows if r['kind'] == kind and r['lead_id'] in first and (r['created'],r['id']) >= first[r['lead_id']]}) for kind in ('received', 'qualified', 'meeting_booked', 'won')}
        daily = {}
        for row in rows:
            day = row['created'][:10]
            daily.setdefault(day, {'sent': 0, 'received': 0})
            if row['kind'] in ('sent', 'received'):
                daily[day][row['kind']] += 1
        whatsapp_failures=0
        if self.db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='wa_sends'").fetchone():
            whatsapp_failures=sum(1 for r in self.db.execute("SELECT w.lead_id,COALESCE(NULLIF(p.source,''),l.origin) acquisition FROM wa_sends w JOIN leads l ON l.id=w.lead_id LEFT JOIN gf_profiles p ON p.lead_id=l.id WHERE w.purpose='operational' AND w.status IN ('failed','unknown') AND w.created>=? AND w.created<?",(lower,upper)) if (lead_ids is None or r['lead_id'] in lead_ids) and (not source or r['acquisition']==source))
        return {'counts': counts, 'cohort': cohort, 'approached': len(first), 'daily': daily,
                'sources': sorted({r['acquisition'] for r in self.db.execute("SELECT lead_id,acquisition FROM gf_events WHERE mode='real' OR (mode='manual' AND kind IN ('won','qualified'))") if lead_ids is None or r['lead_id'] in lead_ids}),
                'failures': whatsapp_failures + sum(1 for r in self.db.execute("SELECT m.lead_id,COALESCE(NULLIF(p.source,''),l.origin) acquisition FROM gf_mail m JOIN leads l ON l.id=m.lead_id LEFT JOIN gf_profiles p ON p.lead_id=l.id WHERE m.direction='out' AND m.status IN ('failed','unknown') AND m.created>=? AND m.created<?",(lower,upper)) if (lead_ids is None or r['lead_id'] in lead_ids) and (not source or r['acquisition']==source))}


class GrowthService(CommercialService):
    def execute(self, store, data):
        action = data.get('action', '')
        if not isinstance(action, str):
            raise ValueError('Ação inválida.')
        if action.startswith('gf_'):
            return self.feature(store, data)
        if action in ('send', 'retry') and (store.db.execute("SELECT 1 FROM gf_mail WHERE lead_id=? AND (direction='in' OR status IN ('sent','unknown','sending')) LIMIT 1", (int(data.get('id', 0)),)).fetchone() or store.db.execute('SELECT 1 FROM gf_ready WHERE lead_id=?',(int(data.get('id',0)),)).fetchone()):
            raise ValueError('Este contato possui atividade real de e-mail. Continue na tela Integrações; o simulador fica separado da operação real.')
        if action == 'block':
            result = super().execute(store, data)
            store.stop_contact(int(data['id']))
            return result
        if action == 'cancel':
            lid = int(data.get('id', 0))
            meeting = store.db.execute('SELECT id FROM meetings WHERE id=? AND lead_id=? AND active=1', (int(data.get('meeting', 0)), lid)).fetchone()
            if not meeting:
                raise ValueError('Reserva não encontrada.')
            store.cancel_meetings(lid)
            store.update(lid, phase='invite', proposed='', offered='[]')
            return {'ok': True}
        if action in ('send', 'retry') and store.config()['provider'] == 'França IA' and not data.get('manual'):
            lid = int(data.get('id', 0))
            lead = store.lead(lid)
            if not lead or lead['paused'] or lead['blocked']:
                raise ValueError('Selecione um contato disponível e retome a SDR.')
            messages = store.messages(lid)
            usable = [m for m in messages if m['role'] != 'error']
            if action == 'send':
                text = str(data.get('text', '')).strip()
                if not 0 < len(text) <= 4000:
                    raise ValueError('Envie de 1 a 4.000 caracteres.')
                if usable and usable[-1]['role'] == 'user':
                    raise ValueError('Há uma resposta pendente. Tente novamente antes de enviar outra mensagem.')
                store.message(lid, 'user', text, 'Teste web')
            else:
                if not usable or usable[-1]['role'] != 'user':
                    raise ValueError('Não há mensagem pendente.')
                text = usable[-1]['text']
            result = ai.plan(store, lid, text)
            ai.apply_plan(store, lid, result, 'test')
            store.message(lid, 'assistant', result['answer'], 'França IA · teste local')
            return {'ok': True}
        return super().execute(store, data)

    def feature(self, store, data):
        action = data['action']
        if action == 'gf_import_preview':
            return store.import_preview(data)
        if action == 'gf_import_commit':
            return store.import_commit(str(data.get('batch', '')))
        if action == 'gf_profile':
            row = store.validate_profile(data)
            lid = int(data.get('id') or 0)
            if lid and not store.lead(lid):
                raise ValueError('Contato não encontrado.')
            duplicate = store.duplicate(row, lid)
            if duplicate:
                raise ValueError(f'Contato duplicado. Já existe no cadastro {duplicate}.')
            if not lid:
                with store.db:
                    lid = store.insert_profile(row)
            else:
                store.update(lid, **{k: row[k] for k in ('name', 'company', 'origin', 'target')}, contact=row['contact'] or row['email'], contact_key=contact_key(row['contact'] or row['email']))
                store.save_profile(lid, {k: row[k] for k in ('email', 'segment', 'source')})
                with store.db:
                    store.db.execute('INSERT OR REPLACE INTO lead_meta VALUES (?,?,?)', (lid, row['tags'], row['owner']))
            return {'id': lid}
        if action == 'gf_metrics':
            return store.metrics(str(data.get('start', '')), str(data.get('end', '')), str(data.get('source', '')))
        if action == 'gf_outcome':
            lid = int(data.get('id', 0))
            outcome = data.get('outcome')
            if not store.lead(lid) or outcome not in ('open', 'won', 'lost'):
                raise ValueError('Contato ou resultado inválido.')
            previous = store.profile(lid)['outcome']
            store.save_profile(lid, {'outcome': outcome, 'reason': str(data.get('reason', '')).strip()[:1000]})
            if outcome != previous:
                store.event(lid, outcome, 'real')
            return {'ok': True}
        if action == 'gf_ai_test':
            text = str(data.get('text', '')).strip()[:4000]
            if not text:
                raise ValueError('Informe uma mensagem para testar.')
            result = ai.classify(store, text)
            result['answer'], result['knowledge_id'] = ai.approved_answer(store, text)
            return result
        if action == 'gf_example':
            text, label = str(data.get('text', '')).strip(), data.get('label')
            if not 2 <= len(text) <= 4000 or label not in ai.INTENTS:
                raise ValueError('Informe um exemplo e uma intenção válida.')
            with store.db:
                store.db.execute('DELETE FROM gf_examples WHERE text=?', (text,))
                store.db.execute('INSERT OR IGNORE INTO gf_examples(text,label) VALUES (?,?)', (text, label))
            return {'ok': True}
        if action == 'gf_train':
            examples = [(text, label) for label, texts in ai.SEEDS.items() for text in texts]
            corrected = {r['text']: r['label'] for r in store.db.execute('SELECT * FROM gf_examples')}
            examples = [(text, label) for text, label in examples if text not in corrected] + list(corrected.items())
            model = ai.IntentModel(examples)
            evaluation = [{'text': text, 'expected': label, **model.predict(text)} for text, label in ai.EVALUATION]
            with store.db:
                version = store.db.execute('INSERT INTO gf_models(examples,created,evaluation) VALUES (?,?,?)', (json.dumps(examples, ensure_ascii=False), stamp(), json.dumps(evaluation, ensure_ascii=False))).lastrowid
            return {'version': version, 'examples': len(examples), 'evaluation': evaluation}
        if action == 'gf_knowledge':
            if data.get('remove'):
                with store.db:
                    store.db.execute('UPDATE gf_knowledge SET active=0 WHERE id=?', (int(data['remove']),))
            else:
                question, answer = str(data.get('question', '')).strip(), str(data.get('answer', '')).strip()
                if not question or not answer or len(question) > 1000 or len(answer) > 3000:
                    raise ValueError('Informe a pergunta (até 1.000 caracteres) e a resposta aprovada (até 3.000).')
                with store.db:
                    store.db.execute('INSERT INTO gf_knowledge(question,answer) VALUES (?,?)', (question, answer))
            return {'ok': True}
        if action == 'gf_credentials':
            store.credentials.configure(data)
            return {'ok': True}
        if action == 'gf_forget':
            store.credentials.forget()
            return {'ok': True}
        if action == 'gf_google_authorize':
            return {'url': store.credentials.authorization_url()}
        if action == 'gf_automation':
            enabled = data.get('enabled')
            limit = int(data.get('limit',40))
            calendar = bool(data.get('calendar'))
            if not isinstance(enabled,bool) or not 1<=limit<=500:
                raise ValueError('Informe o modo de atendimento e um limite diário de 1 a 500 tentativas.')
            if enabled and not all(store.credentials.ready(kind) and kind in store.credentials.checked for kind in ('smtp','imap')):
                raise ValueError('Teste e autentique SMTP e IMAP antes de ativar as respostas automáticas.')
            if enabled and calendar and not (store.credentials.ready('google') and 'google' in store.credentials.checked):
                raise ValueError('Teste a agenda Google antes de ativar a sincronização automática.')
            store.credentials.automation.update(enabled=enabled,limit=limit,calendar=calendar,last_error='')
            return {'ok': True}
        if action == 'gf_ai_export':
            return {'engine': 'França IA / Naive Bayes', 'examples': ai.dataset(store),
                    'knowledge': store.snapshot()['knowledge'], 'intents': ai.INTENTS}
        if action == 'gf_connection_test':
            kind = data.get('kind')
            try:
                if kind == 'smtp':
                    connection = Mail(store.credentials).smtp()
                    connection.noop()
                    connection.close()
                elif kind == 'imap':
                    connection = Mail(store.credentials).imap()
                    connection.logout()
                elif kind == 'google':
                    store.calendar().request()
                else:
                    raise ValueError('Conexão inválida.')
            except Exception:
                raise ValueError('Não foi possível autenticar ou testar essa conexão. Confira as credenciais e o acesso à rede.') from None
            store.credentials.checked[kind] = stamp()
            return {'ok': True}
        if action == 'gf_mail_poll':
            return self.poll(store)
        if action == 'gf_start_real':
            lid = int(data.get('id', 0))
            lead = store.lead(lid)
            if not lead or lead['blocked']:
                raise ValueError('Selecione um contato disponível.')
            if store.db.execute('SELECT 1 FROM gf_ready WHERE lead_id=?',(lid,)).fetchone() or store.db.execute("SELECT 1 FROM gf_mail WHERE lead_id=? AND direction='out' AND status IN ('sent','unknown','sending') LIMIT 1", (lid,)).fetchone():
                return {'ok': True}
            if store.db.execute("SELECT 1 FROM gf_calendar c JOIN meetings m ON m.id=c.meeting_id WHERE m.lead_id=? AND m.active=1 AND c.status<>'local_test'", (lid,)).fetchone():
                raise ValueError('Este contato tem uma reserva operacional. Continue manualmente para preservar a agenda.')
            with store.db:
                store.db.execute('INSERT OR IGNORE INTO gf_ready VALUES (?)', (lid,))
                store.db.execute("UPDATE meetings SET active=0 WHERE lead_id=? AND id NOT IN (SELECT meeting_id FROM gf_calendar WHERE status<>'local_test')", (lid,))
                store.db.execute("UPDATE gf_calendar SET status='cancelled_test' WHERE meeting_id IN (SELECT id FROM meetings WHERE lead_id=? AND active=0) AND status='local_test'", (lid,))
                store.db.execute("UPDATE gf_mail SET status='cancelled',updated=? WHERE lead_id=? AND status IN ('draft','failed')", (stamp(),lid))
            store.update(lid, phase='opening' if lead['origin']=='Outbound' else 'need', need='', offered='[]', proposed='', paused=0)
            store.save_profile(lid, {'goal':'','timing':'','qualified':0})
            return {'ok': True}
        if action == 'gf_mail_draft':
            return self.draft(store, data)
        if action == 'gf_mail_send':
            return self.dispatch(store, str(data.get('mail', '')), bool(data.get('confirmed')))
        if action == 'gf_mail_cancel':
            with store.db:
                store.db.execute("UPDATE gf_mail SET status='cancelled',updated=? WHERE id=? AND status IN ('draft','failed') AND applied=0", (stamp(), str(data.get('mail', ''))))
            return {'ok': True}
        if action == 'gf_mail_reconcile':
            row = store.db.execute("SELECT * FROM gf_mail WHERE id=? AND status='unknown'", (str(data.get('mail', '')),)).fetchone()
            if not row or data.get('resolution') not in ('sent', 'failed'):
                raise ValueError('Selecione um envio incerto e o resultado conferido na caixa de e-mail.')
            status = data['resolution']
            if status == 'sent':
                self.sent(store, dict(row))
            else:
                with store.db:
                    store.db.execute("UPDATE gf_mail SET status='failed',error='Conferido manualmente: não enviado',updated=? WHERE id=?", (stamp(), row['id']))
            return {'ok': True}
        if action == 'gf_slots':
            lid = int(data.get('id', 0))
            if not store.lead(lid):
                raise ValueError('Contato inválido.')
            return {'slots': store.slots(store.config(), lid)}
        if action == 'gf_book':
            lid = int(data.get('id', 0))
            lead = store.lead(lid)
            if not lead or lead['blocked']:
                raise ValueError('Selecione um contato disponível.')
            attendee = str(data.get('attendee', '')).strip()
            if attendee:
                attendee = email_address(attendee)
            value = datetime.fromisoformat(str(data.get('start', ''))).replace(second=0, microsecond=0).isoformat()
            store.reserve(lid, value, store.config(), source='real', attendee=attendee)
            return {'ok': True}
        if action == 'gf_sync':
            return store.sync_calendar()
        if action == 'gf_calendar_read':
            return store.reconcile_calendar()
        raise ValueError('Operação comercial não reconhecida.')

    def draft(self, store, data):
        lid = int(data.get('id', 0))
        lead = store.lead(lid)
        if not lead or lead['blocked']:
            raise ValueError('Contato indisponível para envio.')
        recipient = store.profile(lid)['email'] or (lead['contact'] if '@' in lead['contact'] else '')
        recipient = email_address(recipient)
        mode = data.get('mode', 'manual')
        if mode == 'ai' and not store.db.execute('SELECT 1 FROM gf_ready WHERE lead_id=?',(lid,)).fetchone() and store.db.execute("SELECT 1 FROM messages WHERE lead_id=? AND provider IN ('Teste web','França IA · teste local') LIMIT 1",(lid,)).fetchone():
            raise ValueError('Este contato foi usado no simulador. Clique em Usar contato na operação real antes de preparar uma resposta da IA.')
        inbound = store.db.execute("SELECT * FROM gf_mail WHERE lead_id=? AND direction='in' ORDER BY created DESC,rowid DESC LIMIT 1", (lid,)).fetchone()
        basis = inbound['id'] if inbound else ''
        pending = store.db.execute("SELECT id FROM gf_mail WHERE lead_id=? AND direction='out' AND status IN ('draft','failed','unknown','sending')", (lid,)).fetchone()
        if pending:
            raise ValueError('Há um envio pendente ou incerto para este contato. Envie, cancele ou reconcilie antes de criar outro.')
        result = {}
        if mode == 'ai':
            if not inbound:
                body = store.config()[lead['origin'].lower()]
            else:
                if store.db.execute("SELECT id FROM gf_mail WHERE based_on=? AND direction='out' AND status='sent'", (basis,)).fetchone():
                    raise ValueError('A França IA já respondeu esta mensagem.')
                result = ai.plan(store, lid, inbound['body'])
                body = result['answer']
                if lead['origin']=='Inbound' and not store.db.execute("SELECT 1 FROM gf_mail WHERE lead_id=? AND direction='out' AND status='sent'", (lid,)).fetchone():
                    body = 'Olá! Sou a assistente virtual do Grupo França. ' + body
        elif mode == 'manual':
            body = str(data.get('body', '')).strip()
        else:
            raise ValueError('Tipo de rascunho inválido.')
        subject = str(data.get('subject', '')).strip() or ('Re: ' + inbound['subject'] if inbound else 'Grupo França · Conversa comercial')
        if not body or len(body) > 16000 or len(subject) > 200 or '\r' in subject or '\n' in subject:
            raise ValueError('Confira o assunto e a mensagem do rascunho.')
        mid = uuid.uuid4().hex
        domain = store.credentials.get('GF_MAIL_FROM', 'grupo@example.invalid').split('@')[-1]
        external = '<' + mid + '@' + domain + '>'
        with store.db:
            store.db.execute('''INSERT INTO gf_mail(id,lead_id,direction,recipient,subject,body,mode,status,external_id,reply_to,based_on,plan,created,updated)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', (mid, lid, 'out', recipient, subject, body, mode, 'draft', external,
              inbound['external_id'] if inbound else '', basis, json.dumps(result, ensure_ascii=False), stamp(), stamp()))
        return {'id': mid}

    def sent(self, store, row):
        # Finalize state, message and counters atomically after SMTP acceptance.
        lid = row['lead_id']
        with store.db:
            record = store.db.execute('SELECT applied FROM gf_mail WHERE id=?', (row['id'],)).fetchone()
            if record['applied']:
                return
            result = json.loads(row['plan'])
            current_lead = store.lead(lid)
            latest = store.db.execute("SELECT id FROM gf_mail WHERE lead_id=? AND direction='in' ORDER BY created DESC,rowid DESC LIMIT 1", (lid,)).fetchone()
            if current_lead['blocked'] or (latest['id'] if latest else '') != row['based_on']:
                result = {}
            changes = dict(result.get('changes', {}))
            info = store.profile(lid)
            acquisition = info['source'] or store.lead(lid)['origin']
            def emit(kind):
                store.db.execute('INSERT INTO gf_events(lead_id,kind,mode,acquisition,created) VALUES (?,?,?,?,?)', (lid, kind, 'real', acquisition, stamp()))
            if result.get('cancel'):
                store.db.execute("UPDATE gf_calendar SET operation='cancel',status='pending',updated=? WHERE status<>'local_test' AND meeting_id IN (SELECT id FROM meetings WHERE lead_id=? AND active=1)", (stamp(), lid))
                store.db.execute('UPDATE meetings SET active=0 WHERE lead_id=?', (lid,))
                emit('meeting_cancelled')
            fields = dict(result.get('profile', {}))
            if result.get('qualified'):
                fields['qualified'] = 1
                emit('qualified')
            if fields:
                store.db.execute('INSERT OR IGNORE INTO gf_profiles(lead_id) VALUES (?)', (lid,))
                store.db.execute('UPDATE gf_profiles SET ' + ','.join(key + '=?' for key in fields) + ' WHERE lead_id=?', [*fields.values(), lid])
            if row['mode'] == 'manual':
                changes['paused'] = 1
            changes['updated'] = stamp()
            store.db.execute('UPDATE leads SET ' + ','.join(key + '=?' for key in changes) + ' WHERE id=?', [*changes.values(), lid])
            store.db.execute('INSERT INTO messages(lead_id,role,text,created,provider) VALUES (?,?,?,?,?)',
                             (lid, 'human' if row['mode'] == 'manual' else 'assistant', row['body'], stamp(), 'E-mail · aceito pelo SMTP'))
            emit('sent')
            store.db.execute("UPDATE gf_mail SET status='sent',applied=1,error='',updated=? WHERE id=?", (stamp(), row['id']))

    def dispatch(self, store, mid, confirmed):
        if not confirmed:
            raise ValueError('Confirme o destinatário e o conteúdo antes de enviar.')
        row = store.db.execute('SELECT * FROM gf_mail WHERE id=?', (mid,)).fetchone()
        if not row or row['direction'] != 'out':
            raise ValueError('Rascunho não encontrado.')
        row = dict(row)
        if row['status'] == 'sent':
            return {'status': 'sent'}
        if row['status'] not in ('draft', 'failed'):
            raise ValueError('Esse envio precisa ser reconciliado ou já foi cancelado.')
        lead = store.lead(row['lead_id'])
        if lead['blocked'] or (lead['paused'] and row['mode'] == 'ai'):
            raise ValueError('O contato está bloqueado ou a SDR está pausada.')
        current_recipient = store.profile(lead['id'])['email'] or lead['contact']
        if email_address(current_recipient) != row['recipient']:
            raise ValueError('O e-mail do contato mudou. Cancele o rascunho antigo e prepare outro.')
        if not store.credentials.ready('smtp'):
            raise ValueError('Configure o SMTP antes de enviar.')
        latest = store.db.execute("SELECT id FROM gf_mail WHERE lead_id=? AND direction='in' ORDER BY created DESC,rowid DESC LIMIT 1", (lead['id'],)).fetchone()
        if (latest['id'] if latest else '') != row['based_on']:
            raise ValueError('Chegou outra mensagem. Cancele este rascunho e gere uma resposta atualizada.')
        result = json.loads(row['plan'])
        if result.get('reserve'):
            store.reserve(lead['id'], result['reserve'], store.config(), source='real', attendee=row['recipient'])
            result['reserve'] = ''
            row['plan'] = json.dumps(result, ensure_ascii=False)
            with store.db:
                store.db.execute('UPDATE gf_mail SET plan=? WHERE id=?', (row['plan'], mid))
        with store.db:
            store.db.execute("UPDATE gf_mail SET status='sending',error='',updated=? WHERE id=?", (stamp(), mid))
            store.db.execute('INSERT INTO gf_attempts(mail_id,created) VALUES (?,?)',(mid,stamp()))
        status, error = Mail(store.credentials).send(row)
        if status == 'sent':
            self.sent(store, row)
        else:
            with store.db:
                store.db.execute('UPDATE gf_mail SET status=?,error=?,updated=? WHERE id=?', (status, error, stamp(), mid))
        return {'status': status, 'error': error}

    def poll(self, store):
        transport = Mail(store.credentials)
        connection = transport.imap()
        added, ignored, account = 0, 0, transport.account()
        try:
            validity_raw = connection.response('UIDVALIDITY')[1]
            validity = (validity_raw[0] or b'').decode() if validity_raw else ''
            if not validity:
                raise ValueError('O servidor IMAP não informou UIDVALIDITY.')
            cursor = store.db.execute('SELECT * FROM gf_cursors WHERE account=?', (account,)).fetchone()
            status, result = connection.uid('search', None, 'ALL')
            if status != 'OK':
                raise ValueError('Não foi possível consultar a caixa de entrada.')
            all_ids = [int(value) for value in (result[0] or b'').split()]
            if not cursor or cursor['validity'] != validity:
                with store.db:
                    store.db.execute('INSERT OR REPLACE INTO gf_cursors VALUES (?,?,?)', (account, validity, max(all_ids, default=0)))
                return {'added': 0, 'ignored': 0, 'initialized': True, 'reset': bool(cursor)}
            last = cursor['uid']
            for uid in sorted(value for value in all_ids if value > last)[:50]:
                receipt = store.db.execute('SELECT 1 FROM gf_receipts WHERE account=? AND validity=? AND uid=?', (account, validity, uid)).fetchone()
                if not receipt:
                    status, size_data = connection.uid('fetch', str(uid), '(RFC822.SIZE)')
                    raw_size = next((part for part in size_data if isinstance(part, bytes)), b'')
                    match = re.search(rb'RFC822.SIZE (\d+)', raw_size)
                    if status != 'OK' or not match:
                        raise ValueError('Falha ao consultar uma mensagem IMAP. A leitura será retomada na próxima atualização.')
                    if int(match[1]) <= 2_000_000:
                        status, chunks = connection.uid('fetch', str(uid), '(BODY.PEEK[])')
                        raw = next((part[1] for part in chunks if isinstance(part, tuple)), None)
                        if status != 'OK' or raw is None:
                            raise ValueError('Falha ao ler uma mensagem IMAP. Tente novamente.')
                        message = email.message_from_bytes(raw, policy=default)
                        if self.receive(store, message, account, validity, uid):
                            added += 1
                        else:
                            ignored += 1
                    else:
                        ignored += 1
                with store.db:
                    store.db.execute('INSERT OR IGNORE INTO gf_receipts VALUES (?,?,?)', (account, validity, uid))
                    store.db.execute('INSERT OR REPLACE INTO gf_cursors VALUES (?,?,?)', (account, validity, uid))
            return {'added': added, 'ignored': ignored, 'initialized': False, 'remaining': max(0,len([value for value in all_ids if value>last])-50)}
        finally:
            try:
                connection.logout()
            except Exception:
                pass

    def receive(self, store, message, account, validity, uid):
        if message.get('Auto-Submitted', 'no').lower() != 'no':
            return False
        sender_name, address = email.utils.parseaddr(str(message.get('From', '')))
        try:
            address = email_address(address)
        except ValueError:
            return False
        if address == store.credentials.get('GF_MAIL_FROM').lower():
            return False
        external = str(message.get('Message-ID', '')).strip()
        external = external if re.fullmatch(r'<[^<>\s]{1,450}>', external) else '<' + account + '.' + validity + '.' + str(uid) + '@imap.invalid>'
        if store.db.execute('SELECT id FROM gf_mail WHERE external_id=?', (external,)).fetchone():
            return False
        lid = store.duplicate({'email': address})
        if not lid and store.credentials.get('GF_MAIL_NEW_SENDERS', '0') != '1':
            return False
        try:
            body = mail_body(message)
        except (LookupError, UnicodeError, ValueError):
            return False
        if not body:
            return False
        mid = uuid.uuid4().hex
        with store.db:
            if not lid:
                row = store.validate_profile({'name': sender_name or address, 'contact': address, 'origin': 'Inbound', 'source': 'E-mail recebido'})
                lid = store.insert_profile(row)
            store.db.execute('''INSERT INTO gf_mail(id,lead_id,direction,recipient,subject,body,mode,status,external_id,created,updated)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)''', (mid, lid, 'in', address, re.sub(r'[\r\n]+',' ',str(message.get('Subject', 'Sem assunto')))[:200], body, 'received', 'received', external, stamp(), stamp()))
            store.db.execute('INSERT INTO messages(lead_id,role,text,created,provider) VALUES (?,?,?,?,?)', (lid, 'user', body, stamp(), 'E-mail recebido · IMAP'))
            acquisition = store.profile(lid)['source'] or store.lead(lid)['origin']
            store.db.execute('INSERT INTO gf_events(lead_id,kind,mode,acquisition,created) VALUES (?,?,?,?,?)', (lid, 'received', 'real', acquisition, stamp()))
            intent = ai.priority(body)
            store.db.execute('UPDATE leads SET updated=? WHERE id=?', (stamp(), lid))
            if intent == 'stop':
                store.db.execute("UPDATE leads SET blocked=1,paused=1,phase='stopped',followup='' WHERE id=?", (lid,))
                store.db.execute("UPDATE cadence_runs SET status='cancelled' WHERE lead_id=? AND status='active'", (lid,))
                store.db.execute("UPDATE gf_mail SET status='cancelled',error='Contato bloqueado',updated=? WHERE lead_id=? AND status IN ('draft','failed')", (stamp(), lid))
            elif intent == 'human':
                store.db.execute('UPDATE leads SET paused=1 WHERE id=?', (lid,))
        # Reading mail never sends a response. Draft creation and dispatch are explicit.
        return True

    def automatic_tick(self, store):
        """Reply only after the operator enabled the mode; never cold-send a lead list."""
        mode = store.credentials.automation
        if not mode['enabled']:
            return
        mode.update(last_run=stamp(),last_error='')
        result = self.poll(store)
        if result.get('initialized') or result.get('remaining'):
            return
        messages = store.db.execute("""SELECT m.* FROM gf_mail m JOIN leads l ON l.id=m.lead_id
          WHERE m.direction='in' AND l.paused=0 AND l.blocked=0
          AND m.id=(SELECT newest.id FROM gf_mail newest WHERE newest.lead_id=m.lead_id AND newest.direction='in' ORDER BY newest.created DESC,newest.rowid DESC LIMIT 1)
          AND NOT EXISTS (SELECT 1 FROM gf_mail sent WHERE sent.based_on=m.id AND sent.direction='out' AND sent.status='sent')
          AND NOT EXISTS (SELECT 1 FROM gf_mail pending WHERE pending.lead_id=m.lead_id AND pending.direction='out' AND pending.status IN ('draft','failed','unknown','sending'))
          ORDER BY m.created,m.rowid LIMIT 10""").fetchall()
        for message in messages:
            if not mode['enabled']:
                break
            attempted = store.db.execute('SELECT count(*) FROM gf_attempts WHERE substr(created,1,10)=?',(stamp()[:10],)).fetchone()[0]
            if attempted >= mode['limit']:
                mode['last_error'] = 'Limite diário de tentativas de envio atingido. O atendimento automático retoma no próximo dia.'
                break
            try:
                pending = self.draft(store,{'id':message['lead_id'],'mode':'ai'})
                outcome = self.dispatch(store,pending['id'],True)
                if outcome['status'] != 'sent':
                    mode['last_error'] = outcome.get('error') or 'Confira o envio pendente antes de continuar.'
            except ValueError as exc:
                mode['last_error'] = str(exc)
        if mode['enabled'] and mode['calendar']:
            synced = store.sync_calendar()
            if synced['errors']:
                mode['last_error'] = ' '.join(synced['errors'])[:1000]

    def worker(self, path, stop):
        while not stop.wait(60):
            if not RUNTIME.automation['enabled'] or not self.lock.acquire(blocking=False):
                continue
            store = None
            try:
                store = GrowthStore(path())
                self.automatic_tick(store)
            except Exception:
                RUNTIME.automation['last_error'] = 'A atualização automática não foi concluída. Confira as conexões e os envios pendentes.'
            finally:
                if store:
                    store.db.close()
                self.lock.release()
```

## frontend/src/types.ts

```ts
export interface Lead {
  id: number;
  name: string;
  company: string;
  contact: string;
  origin: string;
  target: string;
  phase: string;
  need: string;
  notes: string;
  followup: string;
  paused: number;
  blocked: number;
  created: string;
  updated: string;
}
export interface Meeting {
  id: number;
  lead_id: number;
  start: string;
  end: string;
  name: string;
  company: string;
}
export interface Message {
  id: number;
  lead_id: number;
  role: string;
  text: string;
  created: string;
  provider: string;
  name?: string;
  company?: string;
  contact?: string;
}
export interface Step {
  kind: "task" | "message" | "wait";
  text: string;
  hours: number;
}
export interface Cadence {
  id: number;
  name: string;
  steps: string;
  created: string;
}
export interface Run {
  id: number;
  lead_id: number;
  cadence_id: number;
  step: number;
  due: string;
  status: string;
}
export interface Config {
  provider: string;
  openai_model: string;
  local_model: string;
  local_url: string;
  daily_limit: number;
  start: number;
  end: number;
  outbound: string;
  inbound: string;
  question: string;
  invite: string;
  knowledge: string;
}
export interface State {
  user?: User;
  team?: Team;
  leads: Lead[];
  meetings: Meeting[];
  phases: Record<string, string>;
  config: Config;
  now: string;
  key_ready: boolean;
  workspace: {
    meta: Record<string, { tags: string; owner: string }>;
    history: Message[];
    cadences: Cadence[];
    runs: Run[];
    usage: {
      id: number;
      created: string;
      provider: string;
      tokens: number;
      status: string;
    }[];
  };
}
export interface Detail {
  lead: Lead;
  messages: Message[];
  summary: string;
  meeting: Meeting | null;
}
export type Page =
  | "dashboard"
  | "growth"
  | "contacts"
  | "inbox"
  | "pipeline"
  | "agenda"
  | "history"
  | "cadences"
  | "integrations"
  | "settings"
  | "blocked"
  | "ai"
  | "team"
  | "mail";
export type Action = (
  data: Record<string, unknown>,
) => Promise<Record<string, unknown> | null>;

export interface User {
  id: number;
  name: string;
  username: string;
  role: "manager" | "seller";
  permissions: string[];
  active: number;
  target: number;
  must_change: number;
  created: string;
}
export interface Team {
  users: User[];
  assignments: Record<string, number>;
  stages: Record<string, string>;
  stage_labels: Record<string, string>;
  permission_labels: Record<string, string>;
}
export interface Session {
  token: string;
  setup_required: boolean;
  user: User | null;
}
export function can(state: State, permission: string) {
  return (
    !state.user ||
    state.user.role === "manager" ||
    state.user.permissions.includes(permission)
  );
}

export const COMMERCIAL_STAGES: Record<string,string> = {
  new:'Novos', contacted:'Contatados', qualified:'Qualificados', meeting:'Reunião',
  proposal:'Proposta', won:'Ganho', lost:'Perdido',
};
export function commercialStage(state:State,lead:Lead){
  return state.team?.stages[String(lead.id)] || 'new';
}
```

## frontend/src/Platform.tsx

```tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  Check,
  Download,
  FileUp,
  Mail,
  Pencil,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import {can,commercialStage,COMMERCIAL_STAGES} from "./types";
import type { Action, Lead, State } from "./types";
import {
  Avatar,
  Button,
  Empty,
  Header,
  Modal,
  NewButton,
  Phase,
  SearchBox,
} from "./components";
import { csv, date } from "./api";
import "./platform.css";

type Profile = {
  email: string;
  segment: string;
  source: string;
  goal: string;
  timing: string;
  qualified: number;
  outcome: string;
  reason: string;
};
type Letter = {
  id: string;
  lead_id: number;
  direction: string;
  recipient: string;
  subject: string;
  body: string;
  mode: string;
  status: string;
  error: string;
  created: string;
};
type CalendarLink = {
  meeting_id: number;
  status: string;
  operation: string;
  attendee: string;
  error: string;
  link: string;
};
type Extra = {
  profiles: Record<string, Profile>;
  mail: Letter[];
  calendar: CalendarLink[];
  knowledge: { id: number; question: string; answer: string }[];
  examples: { id: number; text: string; label: string }[];
  model: { id: number; created: string; evaluation: string } | null;
  connections: {
    values: Record<string, string>;
    configured: Record<string, boolean>;
    checked: Record<string, string>;
    automation?: {
      enabled: boolean;
      limit: number;
      calendar: boolean;
      last_run: string;
      last_error: string;
    };
  };
};
type Props = {
  state: State;
  act: Action;
  busy: boolean;
  notify?: (text: string, error?: boolean) => void;
};
const blank: Extra = {
  profiles: {},
  mail: [],
  calendar: [],
  knowledge: [],
  examples: [],
  model: null,
  connections: { values: {}, configured: {}, checked: {} },
};
function extra(state: State): Extra {
  return (state as State & { commercial?: Extra }).commercial || blank;
}
function profile(state: State, id: number): Partial<Profile> {
  return extra(state).profiles[id] || {};
}
const outcomes: Record<string, string> = {
  open: "Em aberto",
  won: "Convertido",
  lost: "Perdido",
};
const statuses: Record<string, string> = {
  draft: "Rascunho",
  sending: "Enviando",
  sent: "Aceito pelo SMTP",
  failed: "Falhou",
  unknown: "Envio incerto",
  received: "Recebido",
  cancelled: "Cancelado",
  cancelled_test: "Teste cancelado",
  pending: "Sincronização pendente",
  synced: "Sincronizado",
  error: "Erro na sincronização",
  local_test: "Reserva de teste",
  remote_cancelled: "Cancelado no Google",
};
const labels: Record<string, string> = {
  name: "Nome",
  company: "Empresa",
  contact: "Telefone / contato",
  email: "E-mail",
  segment: "Segmento",
  source: "Fonte",
  origin: "Origem",
  target: "Público",
  owner: "Responsável",
  tags: "Tags",
};

export function ContactForm({
  state,
  lead,
  act,
  busy,
  close,
  created,
}: {
  state: State;
  lead: Lead | null;
  act: Action;
  busy: boolean;
  close: () => void;
  created: (id: number) => void;
}) {
  const info = lead ? profile(state, lead.id) : {};
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = await act({ action: "gf_profile", id: lead?.id, ...values });
    if (result) {
      if (lead) close();
      else created(Number(result.id));
    }
  }
  return (
    <Modal
      title={lead ? "Editar contato" : "Novo contato"}
      description="Dados de contato, segmentação e origem da oportunidade."
      close={close}
      busy={busy}
    >
      <form onSubmit={save}>
        <div className="form-grid">
          <label>
            Nome
            <input name="name" maxLength={160} defaultValue={lead?.name} />
          </label>
          <label>
            Empresa
            <input
              name="company"
              maxLength={160}
              defaultValue={lead?.company}
            />
          </label>
          <label>
            Telefone / contato
            <input
              name="contact"
              maxLength={160}
              defaultValue={lead?.contact}
            />
          </label>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              maxLength={160}
              defaultValue={
                info.email || (lead?.contact.includes("@") ? lead.contact : "")
              }
            />
          </label>
          <label>
            Segmento
            <input
              name="segment"
              maxLength={160}
              defaultValue={info.segment}
              placeholder="Ex.: Tecnologia"
            />
          </label>
          <label>
            Fonte
            <input
              name="source"
              maxLength={160}
              defaultValue={info.source}
              placeholder="Ex.: Google Maps / indicação"
            />
          </label>
          <label>
            Origem
            <select name="origin" defaultValue={lead?.origin || "Outbound"}>
              <option>Outbound</option>
              <option>Inbound</option>
            </select>
          </label>
          <label>
            Público
            <select name="target" defaultValue={lead?.target || "Ambos"}>
              <option>Ambos</option>
              <option>B2B</option>
              <option>B2C</option>
            </select>
          </label>
          <label>
            Responsável
            {!lead&&state.user?.role==='manager'?<select name="owner_id" defaultValue={state.user.id}>
              {state.team?.users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>:<input readOnly value={lead?(state.workspace.meta[lead.id]?.owner||state.user?.name||'Igor França'):(state.user?.name||'Igor França')}/>}
          </label>
          <label>
            Tags
            <input
              name="tags"
              maxLength={300}
              defaultValue={lead ? state.workspace.meta[lead.id]?.tags : ""}
            />
          </label>
        </div>
        <div className="modal-actions">
          <Button disabled={busy} onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            <Save size={15} />
            Salvar contato
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type ImportRow = {
  line: number;
  row: Record<string, string>;
  status: string;
  reason: string;
};
type Preview = {
  batch: string;
  headers: string[];
  mapping: Record<string, string>;
  rows: ImportRow[];
};
function Importer({
  state,
  act,
  busy,
  close,
  notify,
}: Props & { close: () => void }) {
  const [text, setText] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [mappingDirty, setMappingDirty] = useState(false),
    [ownerId,setOwnerId]=useState(String(state.user?.id||''));
  async function analyze(content = text, fields = mapping) {
    const result = await act({
      action: "gf_import_preview",
      csv: content,
      ...(Object.keys(fields).length ? { mapping: fields } : {}),
    });
    if (result) {
      const next = result as unknown as Preview;
      setPreview(next);
      setMapping(next.mapping);
      setMappingDirty(false);
    }
  }
  return (
    <Modal
      title="Importar leads por CSV"
      description="Prévia antes de gravar. Contatos duplicados serão ignorados, preservando os cadastros existentes."
      busy={busy}
      close={close}
    >
      <div className="gf-stack">
        {state.user?.role==='manager'?<label>Responsável pelos novos contatos<select value={ownerId} onChange={e=>setOwnerId(e.target.value)} disabled={busy}>
          {state.team?.users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select></label>:<p>Os novos contatos serão adicionados à sua carteira.</p>}
        <label className="field">
          Arquivo CSV UTF-8 (até 700 KB e 500 linhas)
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setError("");
              setPreview(null);
              if (file.size > 700000) {
                setError("Divida o CSV em arquivos de até 700 KB.");
                return;
              }
              try {
                const value = new TextDecoder("utf-8", { fatal: true }).decode(
                  await file.arrayBuffer(),
                );
                setText(value);
                setMapping({});
                await analyze(value, {});
              } catch {
                setError("Salve o arquivo como CSV UTF-8 antes de importar.");
              }
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <Button
          onClick={() =>
            csv("modelo-leads-grupo-franca.csv", Object.entries(labels).filter(([key])=>key!=='owner').map(([,value])=>value), [
              [
                "Ana",
                "Empresa Exemplo",
                "81999999999",
                "ana@example.com",
                "Tecnologia",
                "Google Maps",
                "Outbound",
                "B2B",
                "Prioridade",
              ],
            ])
          }
        >
          <Download size={14} />
          Baixar modelo CSV
        </Button>
        {preview && (
          <>
            <div className="form-grid">
              {Object.entries(labels).filter(([key])=>key!=='owner').map(([key, label]) => (
                <label key={key}>
                  {label}
                  <select
                    value={mapping[key] || ""}
                    onChange={(event) => {
                      setMapping({ ...mapping, [key]: event.target.value });
                      setMappingDirty(true);
                    }}
                  >
                    <option value="">Não importar este campo</option>
                    {preview.headers.map((header) => (
                      <option key={header}>{header}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p>
              {preview.rows.filter((row) => row.status === "ready").length}{" "}
              novos ·{" "}
              {preview.rows.filter((row) => row.status === "duplicate").length}{" "}
              duplicados ·{" "}
              {preview.rows.filter((row) => row.status === "invalid").length}{" "}
              inválidos
            </p>
            <div className="gf-preview table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Contato</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.line}>
                      <td>{row.line}</td>
                      <td>{row.row.company || row.row.name}</td>
                      <td>
                        {row.status === "ready"
                          ? "Pronto para importar"
                          : row.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="primary"
              disabled={
                busy ||
                mappingDirty ||
                !preview.rows.some((row) => row.status === "ready")
              }
              onClick={async () => {
                const result = await act({
                  action: "gf_import_commit",
                  batch: preview.batch,
                  ...(ownerId?{owner_id:Number(ownerId)}:{}),
                });
                if (result) {
                  notify?.(
                    `${result.created} contato(s) importado(s); ${result.skipped} ignorado(s).`,
                  );
                  close();
                }
              }}
            >
              <FileUp size={16} />
              Confirmar importação
            </Button>
          </>
        )}
        {text && (!preview || mappingDirty) && (
          <Button disabled={busy} onClick={() => analyze()}>
            Reanalisar com o mapeamento escolhido
          </Button>
        )}
      </div>
    </Modal>
  );
}

export function Contacts({
  state,
  act,
  busy,
  notify,
  open,
  edit,
  newContact,
  blocked = false,
}: Props & {
  open: (id: number) => void;
  edit: (lead: Lead) => void;
  newContact: () => void;
  blocked?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [segment, setSegment] = useState(""),
    [source, setSource] = useState(""),
    [owner, setOwner] = useState(""),
    [origin, setOrigin] = useState(""),
    [stage, setStage] = useState(""),
    [page, setPage] = useState(0),
    [importing, setImporting] = useState(false),
    [outcomeLead, setOutcomeLead] = useState<Lead | null>(null);
  const rows = state.leads.filter((lead) => {
    const p = profile(state, lead.id),
      meta = state.workspace.meta[lead.id];
    return (
      (!blocked || lead.blocked) &&
      (!segment || p.segment === segment) &&
      (!source || p.source === source) &&
      (!owner || (meta?.owner || "Igor França") === owner) &&
      (!origin || lead.origin === origin) &&
      (!stage || commercialStage(state,lead) === stage) &&
      `${lead.name} ${lead.company} ${lead.contact} ${p.email || ""} ${meta?.tags || ""}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const values = (key: "segment" | "source" | "owner") =>
    Array.from(
      new Set(
        state.leads
          .map((lead) =>
            key === "owner"
              ? state.workspace.meta[lead.id]?.owner || "Igor França"
              : profile(state, lead.id)[key] || "",
          )
          .filter(Boolean),
      ),
    ).sort();
  const safePage=Math.min(page,Math.max(0,Math.ceil(rows.length/15)-1));
  function choose(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }
  return (
    <>
      <Header
        title={blocked ? "Não contatar" : "Contatos"}
        description="Base segmentada, histórico preservado e duplicados sob controle."
      >
        <Button
          onClick={() =>
            csv(
              "grupo-franca-leads.csv",
              [
                ...Object.values(labels),
                "Etapa",
                "Objetivo",
                "Prazo",
                "Resultado",
              ],
              rows.map((lead) => {
                const p = profile(state, lead.id),
                  m = state.workspace.meta[lead.id];
                return [
                  lead.name,
                  lead.company,
                  lead.contact,
                  p.email,
                  p.segment,
                  p.source,
                  lead.origin,
                  lead.target,
                  m?.owner,
                  m?.tags,
                  (state.team?.stage_labels||COMMERCIAL_STAGES)[commercialStage(state,lead)],
                  p.goal,
                  p.timing,
                  outcomes[p.outcome || "open"],
                ];
              }),
            )
          }
        >
          <Download size={15} />
          Exportar CSV
        </Button>
        {!blocked && (
          <>
            <Button disabled={!can(state,"import")} onClick={() => setImporting(true)}>
              <FileUp size={15} />
              Importar CSV
            </Button>
            {can(state,"create")&&<NewButton onClick={newContact} />}
          </>
        )}
      </Header>
      <section className="card">
        <details className="contact-filters"><summary>Filtros</summary><div className="gf-filters">
          <SearchBox
            value={query}
            onChange={(value) => choose(setQuery, value)}
          />
          {(
            [
              ["Segmento", segment, setSegment, "segment"],
              ["Fonte", source, setSource, "source"],
              ["Responsável", owner, setOwner, "owner"],
            ] as const
          ).map(([label, value, setter, key]) => (
            <select
              key={key}
              aria-label={label}
              value={value}
              onChange={(event) => choose(setter, event.target.value)}
            >
              <option value="">{label}: todos</option>
              {values(key).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ))}
          <select
            aria-label="Origem"
            value={origin}
            onChange={(event) => choose(setOrigin, event.target.value)}
          >
            <option value="">Todas as origens</option>
            <option>Inbound</option>
            <option>Outbound</option>
          </select>
          <select
            aria-label="Etapa"
            value={stage}
            onChange={(event) => choose(setStage, event.target.value)}
          >
            <option value="">Todas as etapas</option>
            {Object.entries(state.team?.stage_labels||COMMERCIAL_STAGES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div></details>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contato</th>
                  <th>Segmento / fonte</th>
                  <th>Responsável</th>
                  <th>Etapa</th>
                  <th>Resultado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(safePage * 15, safePage * 15 + 15).map((lead) => {
                  const p = profile(state, lead.id);
                  return (
                    <tr key={lead.id}>
                      <td>
                        <button
                          className="person person-button"
                          onClick={() => open(lead.id)}
                        >
                          <Avatar name={lead.company || lead.name} />
                          <span>
                            <b>{lead.company || lead.name}</b>
                            <small>
                              {lead.contact || p.email || "Sem contato"}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        {p.segment || "Não informado"}
                        <small className="owner">
                          {p.source || lead.origin}
                        </small>
                      </td>
                      <td>
                        {state.workspace.meta[lead.id]?.owner || "Igor França"}
                      </td>
                      <td>
                        <span className="status neutral">{lead.blocked?'Não contatar':state.team?.stage_labels[state.team.stages[lead.id]]||state.phases[lead.phase]}</span>
                      </td>
                      <td>{outcomes[p.outcome || "open"]}</td>
                      <td>
                        <div className="row-actions">
                          <Button
                            title="Editar contato"
                            variant="icon"
                            disabled={busy||!can(state,"edit")}
                            onClick={() => edit(lead)}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button disabled={!can(state,"move")} onClick={() => setOutcomeLead(lead)}>
                            Resultado
                          </Button>
                          <Button
                            title="Abrir ficha"
                            variant="icon"
                            onClick={() => open(lead.id)}
                          >
                            <ArrowUpRight size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nenhum contato neste filtro"
            description="Cadastre um contato, importe uma lista ou ajuste os filtros."
          />
        )}
        <div className="pagination">
          <small>{rows.length} contato(s)</small>
          <div>
            <Button disabled={!safePage} onClick={() => setPage(safePage - 1)}>
              Anterior
            </Button>
            <span>Página {safePage + 1}</span>
            <Button
              disabled={(safePage + 1) * 15 >= rows.length}
              onClick={() => setPage(safePage + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </section>
      {importing && (
        <Importer
          state={state}
          act={act}
          busy={busy}
          close={() => setImporting(false)}
          notify={notify}
        />
      )}
      {outcomeLead && (
        <Modal
          title="Resultado comercial"
          description={outcomeLead.company || outcomeLead.name}
          close={() => setOutcomeLead(null)}
          busy={busy}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await act({
                  action: "gf_outcome",
                  id: outcomeLead.id,
                  ...Object.fromEntries(new FormData(event.currentTarget)),
                })
              )
                setOutcomeLead(null);
            }}
          >
            <label className="field">
              Resultado
              <select
                name="outcome"
                defaultValue={profile(state, outcomeLead.id).outcome || "open"}
              >
                {Object.entries(outcomes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Motivo / contexto
              <textarea
                name="reason"
                maxLength={1000}
                defaultValue={profile(state, outcomeLead.id).reason}
              />
            </label>
            <div className="modal-actions">
              <Button type="submit" variant="primary" disabled={busy}>
                Salvar resultado
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

type Metrics = {
  counts: Record<string, number>;
  cohort: Record<string, number>;
  approached: number;
  daily: Record<string, { sent: number; received: number }>;
  sources: string[];
  failures: number;
};
export function Growth({ state, act, busy }: Props) {
  const [start, setStart] = useState(() => {
      const d = new Date(state.now);
      d.setDate(d.getDate() - 29);
      return d.toISOString().slice(0, 10);
    }),
    [end, setEnd] = useState(state.now.slice(0, 10)),
    [source, setSource] = useState(""),
    [report, setReport] = useState<Metrics | null>(null);
  const actRef = useRef(act);
  actRef.current = act;
  async function load() {
    const result = await actRef.current({
      action: "gf_metrics",
      start,
      end,
      source,
    });
    if (result) setReport(result as unknown as Metrics);
  }
  useEffect(() => {
    let current = true;
    setReport(null);
    void actRef
      .current({ action: "gf_metrics", start, end, source })
      .then((result) => {
        if (current && result) setReport(result as unknown as Metrics);
      });
    return () => {
      current = false;
    };
  }, [start, end, source]);
  return (
    <>
      <Header
        title="Análise comercial"
        description="Atividade real por período e fonte. Simulações ficam fora destes números."
      >
        <Button disabled={busy} onClick={load}>
          <RefreshCw size={15} />
          Atualizar
        </Button>
      </Header>
      <section className="card gf-filters">
        <label>
          De
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          Até
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <label>
          Fonte
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">Todas as fontes</option>
            {Array.from(
              new Set(
                [
                  ...(report?.sources || []),
                  ...Object.values(extra(state).profiles).map((p) => p.source),
                  source,
                ].filter(Boolean),
              ),
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </section>
      {report && (
        <>
          <div className="metrics-grid gf-metrics">
            {(
              [
                ["sent", "Contatos com envio real"],
                ["received", "Contatos que responderam"],
                ["qualified", "Interesse qualificado"],
                ["meeting_booked", "Reuniões reservadas"],
                ["won", "Oportunidades convertidas"],
              ] as const
            ).map(([key, label]) => (
              <article className="metric blue" key={key}>
                <span>{label}</span>
                <strong>{report.counts[key] || 0}</strong>
                <small>Contatos únicos com atividade no período</small>
              </article>
            ))}
          </div>
          <div className="two-col">
            <section className="card gf-pad">
              <h2>Conversão entre contatos abordados</h2>
              <p>
                {report.approached} contato(s) tiveram envio aceito no período.
              </p>
              {(
                [
                  ["received", "Responderam depois do envio"],
                  ["qualified", "Qualificados depois do envio"],
                  ["meeting_booked", "Reservaram reunião"],
                  ["won", "Convertidos"],
                ] as const
              ).map(([key, label]) => (
                <div className="gf-stat" key={key}>
                  <span>{label}</span>
                  <b>
                    {report.cohort[key]} ·{" "}
                    {report.approached
                      ? (
                          (report.cohort[key] / report.approached) *
                          100
                        ).toFixed(1)
                      : "0"}
                    %
                  </b>
                </div>
              ))}
              <small>
                Considera eventos registrados depois do primeiro envio desse
                contato no período, até a data final.
              </small>
            </section>
            <section className="card gf-pad">
              <h2>Envios e recebimentos por dia</h2>
              {Object.entries(report.daily)
                .sort()
                .map(([day, counts]) => (
                  <div className="gf-stat" key={day}>
                    <span>{day.split("-").reverse().join("/")}</span>
                    <b>
                      {counts.sent} enviados · {counts.received} recebidos
                    </b>
                  </div>
                ))}
              {!Object.keys(report.daily).length && (
                <p>Sem atividade real no período.</p>
              )}
              <p>{report.failures} envio(s) com falha ou resultado incerto.</p>
            </section>
          </div>
          <p className="data-note">
            Envios registrados não comprovam entrega nem leitura. Qualificações e
            vendas incluem os registros manuais do funil. Reuniões reservadas não
            significam reuniões realizadas. Testes de envio ficam fora das abordagens.
          </p>
        </>
      )}
    </>
  );
}

const connectionFields: Record<string, string> = {
  GF_SMTP_HOST: "Servidor SMTP",
  GF_SMTP_PORT: "Porta SMTP (465 ou 587)",
  GF_MAIL_USER: "Usuário do e-mail",
  GF_MAIL_FROM: "E-mail remetente",
  GF_MAIL_PASSWORD: "Senha de aplicativo do e-mail",
  GF_IMAP_HOST: "Servidor IMAP",
  GF_IMAP_PORT: "Porta IMAP (993)",
  GF_IMAP_FOLDER: "Pasta IMAP (INBOX)",
  GF_GOOGLE_CLIENT_ID: "Google OAuth · Client ID",
  GF_GOOGLE_CLIENT_SECRET: "Google OAuth · Client secret",
  GF_GOOGLE_REFRESH_TOKEN: "Google OAuth · Refresh token",
  GF_GOOGLE_CALENDAR_ID: "Google · ID da agenda (primary)",
};
export function Integrations({ state, act, busy, notify }: Props) {
  const data = extra(state),
    [tab, setTab] = useState<"mail" | "connections">("mail"),
    [fields, setFields] = useState<Record<string, string>>({
      ...data.connections.values,
    }),
    [selected, setSelected] = useState(""),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [review, setReview] = useState<Letter | null>(null),
    [auto, setAuto] = useState(false),
    [oauthUrl, setOauthUrl] = useState(""),
    [startReal, setStartReal] = useState(false),
    [automationReview, setAutomationReview] = useState(false),
    [autoLimit, setAutoLimit] = useState(
      data.connections.automation?.limit || 40,
    ),
    [autoCalendar, setAutoCalendar] = useState(
      data.connections.automation?.calendar || false,
    );
  const automation = data.connections.automation;
  const actRef = useRef(act),
    busyRef = useRef(busy);
  actRef.current = act;
  busyRef.current = busy;
  useEffect(() => {
    if (!auto || automation?.enabled) return;
    const timer = setInterval(() => {
      if (!busyRef.current) void actRef.current({ action: "gf_mail_poll" });
    }, 60000);
    return () => clearInterval(timer);
  }, [auto, automation?.enabled]);
  async function poll() {
    const result = await act({ action: "gf_mail_poll" });
    if (result)
      notify?.(
        result.initialized
          ? result.reset
            ? "O identificador da caixa mudou. Recepção reiniciada a partir das próximas mensagens."
            : "Recepção iniciada. A próxima atualização buscará apenas mensagens novas."
          : `${result.added} mensagem(ns) recebida(s); ${result.ignored} ignorada(s).`,
      );
  }
  return (
    <>
      <Header
        title="Canais e conexões"
        description="E-mail real, atendimento assistido ou automático e agenda com autorização própria."
      />
      <div className="gf-tabs">
        <Button
          variant={tab === "mail" ? "primary" : ""}
          onClick={() => setTab("mail")}
        >
          <Mail size={16} />
          E-mail
        </Button>
        <Button
          variant={tab === "connections" ? "primary" : ""}
          onClick={() => setTab("connections")}
        >
          Configurar conexões
        </Button>
      </div>
      {tab === "connections" ? (
        <form
          className="card gf-pad"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await act({ action: "gf_credentials", ...fields })) {
              setFields((previous) =>
                Object.fromEntries(
                  Object.entries(previous).filter(
                    ([key]) =>
                      !key.includes("PASSWORD") &&
                      !key.includes("SECRET") &&
                      !key.includes("TOKEN"),
                  ),
                ),
              );
              notify?.(
                "Credenciais disponíveis nesta sessão. Teste as conexões.",
              );
            }
          }}
        >
          <h2>Credenciais da operação</h2>
          <p>
            Os segredos ficam na memória do servidor e precisam ser informados
            novamente após reiniciar. Também é possível usar variáveis de
            ambiente GF_.
          </p>
          <div className="form-grid">
            {Object.entries(connectionFields).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type={/PASSWORD|SECRET|TOKEN/.test(key) ? "password" : "text"}
                  autoComplete="off"
                  maxLength={4000}
                  value={fields[key] || ""}
                  onChange={(event) =>
                    setFields({ ...fields, [key]: event.target.value })
                  }
                  placeholder={
                    /PASSWORD|SECRET|TOKEN/.test(key)
                      ? "Vazio mantém o valor atual"
                      : ""
                  }
                />
              </label>
            ))}
          </div>
          <label className="gf-check">
            <input
              type="checkbox"
              checked={fields.GF_MAIL_NEW_SENDERS === "1"}
              onChange={(event) =>
                setFields({
                  ...fields,
                  GF_MAIL_NEW_SENDERS: event.target.checked ? "1" : "0",
                })
              }
            />
            Cadastrar remetentes novos como leads inbound
          </label>
          <div className="gf-actions">
            <Button type="submit" variant="primary" disabled={busy}>
              <Save size={15} />
              Aplicar nesta sessão
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (await act({ action: "gf_forget" })) {
                  setFields({});
                  setAuto(false);
                }
              }}
            >
              Limpar credenciais da sessão
            </Button>
          </div>
          <div className="gf-actions">
            <Button
              disabled={busy}
              onClick={async () => {
                const result = await act({ action: "gf_google_authorize" });
                if (result) setOauthUrl(String(result.url));
              }}
            >
              Preparar autorização Google
            </Button>
            {oauthUrl && (
              <a
                className="btn primary"
                href={oauthUrl}
                target="_blank"
                rel="noreferrer"
              >
                Autorizar Google Calendar
              </a>
            )}
          </div>
          <div className="gf-status-grid">
            {(["smtp", "imap", "google"] as const).map((kind) => (
              <article className="gf-connection" key={kind}>
                <b>{kind.toUpperCase()}</b>
                <p>
                  {data.connections.checked[kind]
                    ? "Autenticação testada em " +
                      date(data.connections.checked[kind])
                    : data.connections.configured[kind]
                      ? "Configurado · teste pendente"
                      : "Não configurado"}
                </p>
                <Button
                  disabled={busy || !data.connections.configured[kind]}
                  onClick={async () => {
                    if (await act({ action: "gf_connection_test", kind }))
                      notify?.("Conexão autenticada com sucesso.");
                  }}
                >
                  Testar conexão
                </Button>
              </article>
            ))}
          </div>
          <p>
            O Google Calendar requer Calendar API habilitada, autorização OAuth
            para a agenda e um refresh token com acesso a eventos. Nenhuma conta
            é conectada só por preencher o nome.
          </p>
        </form>
      ) : (
        <>
          <div className="info-banner">
            <Mail size={18} />
            <span>
              A primeira leitura marca o ponto de início da caixa. Depois,
              buscamos até 50 mensagens novas por atualização. E-mails
              automáticos, anexos e mensagens maiores que 2 MB não são
              importados. Respostas automáticas dependem da ativação explícita
              do modo abaixo.
            </span>
          </div>
          <div className="gf-actions">
            <Button
              disabled={busy || !data.connections.configured.imap}
              onClick={poll}
            >
              <RefreshCw size={15} />
              Atualizar recebimentos
            </Button>
            <label className="gf-check">
              <input
                type="checkbox"
                checked={auto}
                disabled={
                  !data.connections.configured.imap || automation?.enabled
                }
                onChange={(event) => setAuto(event.target.checked)}
              />
              Receber a cada minuto enquanto esta tela estiver aberta
            </label>
          </div>
          <section className="card gf-pad">
            <h2>Atendimento automático da França IA</h2>
            <p>
              {automation?.enabled
                ? "Ativo no servidor, inclusive com esta tela fechada. Pause para interromper novas respostas."
                : "Desativado. O modo assistido mantém a revisão individual de cada rascunho."}
            </p>
            <div className="form-grid">
              <label>
                Limite diário de tentativas de envio
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={autoLimit}
                  disabled={automation?.enabled}
                  onChange={(event) => setAutoLimit(Number(event.target.value))}
                />
              </label>
              <label className="gf-check">
                <input
                  type="checkbox"
                  checked={autoCalendar}
                  disabled={automation?.enabled}
                  onChange={(event) => setAutoCalendar(event.target.checked)}
                />
                Sincronizar reservas e enviar convites pelo Google
                automaticamente
              </label>
            </div>
            <p>
              Responde somente mensagens recebidas; não dispara sua lista de
              leads. Pedidos de humano pausam o contato. Pedidos de não contato
              bloqueiam os envios. O limite considera também tentativas manuais
              no mesmo dia.
            </p>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                if (automation?.enabled) {
                  await act({
                    action: "gf_automation",
                    enabled: false,
                    limit: autoLimit,
                    calendar: autoCalendar,
                  });
                } else setAutomationReview(true);
              }}
            >
              {automation?.enabled
                ? "Pausar atendimento automático"
                : "Ativar atendimento automático"}
            </Button>
            {!data.connections.checked.smtp ||
            !data.connections.checked.imap ? (
              <p>Teste SMTP e IMAP em Configurar conexões antes de ativar.</p>
            ) : null}
            {automation?.last_run && (
              <p>Última atualização: {date(automation.last_run)}</p>
            )}
            {automation?.last_error && (
              <p className="gf-error">{automation.last_error}</p>
            )}
          </section>
          <section className="card gf-pad">
            <h2>Preparar mensagem</h2>
            <div className="form-grid">
              <label>
                Contato
                <select
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  <option value="">Selecione um contato</option>
                  {state.leads
                    .filter((lead) => !lead.blocked)
                    .map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.company || lead.name} ·{" "}
                        {profile(state, lead.id).email || lead.contact}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Assunto
                <input
                  maxLength={200}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Vazio usa o assunto da conversa"
                />
              </label>
              <label className="full">
                Mensagem manual
                <textarea
                  rows={4}
                  maxLength={16000}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Escreva para assumir o atendimento. O envio manual pausa a SDR."
                />
              </label>
            </div>
            <div className="gf-actions">
              <Button
                disabled={busy || !selected}
                onClick={() => setStartReal(true)}
              >
                Usar contato na operação real
              </Button>
              <Button
                disabled={busy || !selected || !body.trim()}
                onClick={async () => {
                  if (
                    await act({
                      action: "gf_mail_draft",
                      id: Number(selected),
                      mode: "manual",
                      subject,
                      body,
                    })
                  ) {
                    setBody("");
                    notify?.(
                      "Rascunho criado. Revise na lista antes de enviar.",
                    );
                  }
                }}
              >
                Criar rascunho manual
              </Button>
              <Button
                variant="primary"
                disabled={busy || !selected}
                onClick={async () => {
                  if (
                    await act({
                      action: "gf_mail_draft",
                      id: Number(selected),
                      mode: "ai",
                      subject,
                    })
                  )
                    notify?.("Resposta da França IA preparada para revisão.");
                }}
              >
                <BrainCircuit size={16} />
                Preparar com França IA
              </Button>
            </div>
          </section>
          <section className="card gf-pad">
            <h2>Mensagens e envios recentes</h2>
            {data.mail.map((letter) => (
              <article className="gf-letter" key={letter.id}>
                <div className="gf-letter-heading">
                  <b>
                    {letter.direction === "in" ? "Recebido de" : "Para"}{" "}
                    {letter.recipient}
                  </b>
                  <span
                    className={
                      "status " +
                      (["failed", "unknown"].includes(letter.status)
                        ? "red"
                        : letter.status === "sent"
                          ? "green"
                          : "blue")
                    }
                  >
                    {statuses[letter.status] || letter.status}
                  </span>
                </div>
                <strong>{letter.subject}</strong>
                <small>
                  {date(letter.created)} ·{" "}
                  {letter.mode === "ai"
                    ? "França IA"
                    : letter.mode === "manual"
                      ? "Manual"
                      : "IMAP"}
                </small>
                <details open={letter.status === "draft"}>
                  <summary>Conteúdo da mensagem</summary>
                  <p className="gf-mail-body">{letter.body}</p>
                </details>
                {letter.error && <p className="gf-error">{letter.error}</p>}
                <div className="gf-actions">
                  {["draft", "failed"].includes(letter.status) && (
                    <>
                      <Button
                        variant="primary"
                        disabled={busy || !data.connections.configured.smtp}
                        onClick={() => setReview(letter)}
                      >
                        <Send size={14} />
                        Revisar e enviar
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          act({ action: "gf_mail_cancel", mail: letter.id })
                        }
                      >
                        Cancelar rascunho
                      </Button>
                    </>
                  )}
                  {letter.status === "unknown" && (
                    <>
                      <small>
                        Confira esta mensagem na caixa do remetente antes de
                        decidir:
                      </small>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          act({
                            action: "gf_mail_reconcile",
                            mail: letter.id,
                            resolution: "sent",
                          })
                        }
                      >
                        Conferi: foi enviado
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          act({
                            action: "gf_mail_reconcile",
                            mail: letter.id,
                            resolution: "failed",
                          })
                        }
                      >
                        Conferi: não foi enviado
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {!data.mail.length && (
              <Empty
                title="Nenhum e-mail registrado"
                description="Configure a conta e inicie os recebimentos ou prepare uma abordagem."
              />
            )}
          </section>
        </>
      )}
      {automationReview && (
        <Modal
          title="Ativar respostas automáticas reais"
          description="A França IA responderá novos e-mails sem revisão individual, dentro do limite escolhido. A lista importada não será disparada automaticamente."
          close={() => setAutomationReview(false)}
          busy={busy}
        >
          <p>
            {autoCalendar
              ? "Reservas também serão sincronizadas e os convites enviados pelo Google Calendar autorizado."
              : "Reservas ficam locais até você sincronizar a agenda."}
          </p>
          <p>
            O servidor precisa continuar aberto. Você poderá pausar o modo a
            qualquer momento; um envio já em andamento pode terminar.
          </p>
          <div className="modal-actions">
            <Button disabled={busy} onClick={() => setAutomationReview(false)}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act({
                    action: "gf_automation",
                    enabled: true,
                    limit: autoLimit,
                    calendar: autoCalendar,
                  })
                ) {
                  setAutomationReview(false);
                  setAuto(false);
                  notify?.("Atendimento automático ativado no servidor.");
                }
              }}
            >
              Confirmar ativação automática
            </Button>
          </div>
        </Modal>
      )}
      {startReal && (
        <Modal
          title="Iniciar operação real"
          description="O histórico será preservado. Relato, objetivo, prazo e reservas de teste serão reiniciados; o simulador ficará desativado para este contato."
          close={() => setStartReal(false)}
          busy={busy}
        >
          <div className="modal-actions">
            <Button onClick={() => setStartReal(false)} disabled={busy}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act({ action: "gf_start_real", id: Number(selected) })
                ) {
                  setStartReal(false);
                  notify?.("Contato preparado para atendimento real.");
                }
              }}
            >
              Confirmar início da operação real
            </Button>
          </div>
        </Modal>
      )}
      {review && (
        <Modal
          title="Confirmar envio real"
          description={"Destinatário: " + review.recipient}
          close={() => setReview(null)}
          busy={busy}
        >
          <h3>{review.subject}</h3>
          <p className="gf-mail-body">{review.body}</p>
          <div className="modal-actions">
            <Button disabled={busy} onClick={() => setReview(null)}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                const result = await act({
                  action: "gf_mail_send",
                  mail: review.id,
                  confirmed: true,
                });
                if (result) {
                  setReview(null);
                  notify?.(
                    result.status === "sent"
                      ? "Mensagem aceita pelo servidor SMTP."
                      : String(result.error || "Confira o resultado do envio."),
                    result.status !== "sent",
                  );
                }
              }}
            >
              <Send size={15} />
              Enviar para este contato
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Agenda({
  state,
  act,
  busy,
  notify,
  open,
  confirm,
}: Props & {
  open: (id: number) => void;
  confirm: (text: string, data: Record<string, unknown>) => void;
}) {
  const data = extra(state),
    [selected, setSelected] = useState(""),
    [start, setStart] = useState(""),
    [attendee, setAttendee] = useState(""),
    [slots, setSlots] = useState<string[]>([]),
    [review, setReview] = useState(false);
  return (
    <>
      <Header
        title="Agenda comercial"
        description="Reservas, cancelamentos e reagendamentos com histórico e status de sincronização."
      >
        <Button
          disabled={busy || !data.connections.configured.google || (state.user!==undefined&&state.user.role!=="manager")}
          onClick={async () => {
            const result = await act({ action: "gf_calendar_read" });
            if (result)
              notify?.(
                `${result.updated} reserva(s) reconciliada(s). ${(result.errors as string[]).join(" ")}`,
                Boolean((result.errors as string[]).length),
              );
          }}
        >
          Ler alterações do Google
        </Button>
        <Button
          variant="primary"
          disabled={busy || !data.connections.configured.google || (state.user!==undefined&&state.user.role!=="manager")}
          onClick={async () => {
            const result = await act({ action: "gf_sync" });
            if (result)
              notify?.(
                `${result.synced} operação(ões) sincronizada(s). ${(result.errors as string[]).join(" ")}`,
                Boolean((result.errors as string[]).length),
              );
          }}
        >
          <RefreshCw size={15} />
          Sincronizar e enviar convites
        </Button>
      </Header>
      <section className="card gf-pad">
        <h2>Reservar ou reagendar</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setReview(true);
          }}
        >
          <div className="form-grid">
            <label>
              Contato
              <select
                required
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setSlots([]);
                  setStart("");
                  setAttendee(
                    profile(state, Number(event.target.value)).email || "",
                  );
                }}
              >
                <option value="">Selecione</option>
                {state.leads
                  .filter((lead) => !lead.blocked)
                  .map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.company || lead.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Data e hora (Brasília)
              <input
                type="datetime-local"
                required
                step={1800}
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label className="full">
              E-mail para o convite Google (opcional)
              <input
                type="email"
                value={attendee}
                onChange={(event) => setAttendee(event.target.value)}
                placeholder="Sem e-mail, cria apenas o evento na agenda conectada"
              />
            </label>
          </div>
          <div className="gf-actions">
            <Button
              disabled={busy || !selected || !can(state,"book")}
              onClick={async () => {
                const result = await act({
                  action: "gf_slots",
                  id: Number(selected),
                });
                if (result) setSlots(result.slots as string[]);
              }}
            >
              Consultar horários livres
            </Button>
            {slots.map((value) => (
              <Button key={value} onClick={() => setStart(value.slice(0, 16))}>
                {date(value)}
              </Button>
            ))}
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !selected || !start || !can(state,"book")}
            >
              <CalendarDays size={15} />
              Revisar reserva
            </Button>
          </div>
        </form>
        <p>
          Reuniões de 30 minutos, de segunda a sexta. A disponibilidade externa
          é consultada quando o Google está configurado. A sincronização e o
          envio de convites são uma ação separada.
        </p>
      </section>
      <section className="card gf-pad">
        <h2>Reservas ativas</h2>
        {state.meetings.map((meeting) => {
          const link = data.calendar.find(
            (row) => row.meeting_id === meeting.id,
          );
          return (
            <article className="gf-letter" key={meeting.id}>
              <div className="gf-letter-heading">
                <button
                  className="person-button"
                  onClick={() => open(meeting.lead_id)}
                >
                  {meeting.company || meeting.name}
                </button>
                <b>{date(meeting.start)}</b>
              </div>
              <p>
                {link ? statuses[link.status] : "Reserva local anterior"}
                {link?.attendee ? " · Convite: " + link.attendee : ""}
              </p>
              {link?.error && <p className="gf-error">{link.error}</p>}
              {link?.link?.startsWith("https://www.google.com/calendar") && (
                <a href={link.link} target="_blank" rel="noreferrer">
                  Abrir no Google Calendar
                </a>
              )}
              <div className="gf-actions">
                <Button
                  onClick={() => {
                    setSelected(String(meeting.lead_id));
                    setStart(meeting.start.slice(0, 16));
                    setAttendee(link?.attendee || "");
                  }}
                >
                  Reagendar
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    confirm(
                      "Cancelar esta reserva? Se estiver sincronizada, depois clique em Sincronizar para avisar os convidados.",
                      {
                        action: "cancel",
                        id: meeting.lead_id,
                        meeting: meeting.id,
                      },
                    )
                  }
                >
                  Cancelar reserva
                </Button>
              </div>
            </article>
          );
        })}
        {!state.meetings.length && (
          <Empty
            title="Agenda disponível"
            description="As reservas aparecerão aqui."
          />
        )}
      </section>
      <section className="card gf-pad">
        <h2>Retornos para acompanhar</h2>
        {state.leads
          .filter((lead) => lead.followup && !lead.blocked)
          .sort((a, b) => a.followup.localeCompare(b.followup))
          .map((lead) => (
            <article className="gf-letter" key={lead.id}>
              <div className="gf-letter-heading">
                <b>{lead.company || lead.name}</b>
                <span>
                  {date(lead.followup)}
                  {lead.followup <= state.now ? " · Vencido" : ""}
                </span>
              </div>
              <Button onClick={() => open(lead.id)}>
                Abrir ficha do contato
              </Button>
            </article>
          ))}
        {!state.leads.some((lead) => lead.followup && !lead.blocked) && (
          <p>
            Sem retornos pendentes. Defina o próximo retorno na ficha do
            contato.
          </p>
        )}
      </section>
      {data.calendar.some(
        (row) =>
          row.operation === "cancel" &&
          row.status !== "synced" &&
          row.status !== "local_test",
      ) && (
        <div className="info-banner">
          Há cancelamentos pendentes de sincronização com o Google.
        </div>
      )}
      {review && (
        <Modal
          title="Confirmar reserva"
          description={date(start) + " · 30 minutos · Brasília"}
          close={() => setReview(false)}
          busy={busy}
        >
          <p>
            {state.leads.find((lead) => lead.id === Number(selected))
              ?.company ||
              state.leads.find((lead) => lead.id === Number(selected))?.name}
          </p>
          <p>
            {attendee
              ? "Convite pendente para " + attendee
              : "Sem convidado externo."}
          </p>
          <div className="modal-actions">
            <Button onClick={() => setReview(false)} disabled={busy}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act({
                    action: "gf_book",
                    id: Number(selected),
                    start,
                    attendee,
                  })
                ) {
                  setReview(false);
                  notify?.(
                    "Reserva salva. Confira o status e sincronize quando desejar enviar o convite.",
                  );
                }
              }}
            >
              Confirmar reserva local
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

const intentions: Record<string, string> = {
  yes: "Aceitação",
  no: "Recusa pontual",
  stop: "Não contatar",
  human: "Atendimento humano",
  question: "Pergunta",
  statement: "Relato",
  unclear: "Indefinido",
};
export function FrancaAI({ state, act, busy, notify }: Props) {
  const data = extra(state),
    [text, setText] = useState(""),
    [label, setLabel] = useState("statement"),
    [test, setTest] = useState<Record<string, unknown> | null>(null),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState("");
  return (
    <>
      <Header
        title="França IA"
        description="Inteligência comercial local, treinada com exemplos aprovados e respostas controladas pelo Grupo França."
      >
        <Button
          variant="primary"
          disabled={busy || state.config.provider === "França IA"}
          onClick={async () => {
            if (await act({ action: "config", provider: "França IA" }))
              notify?.(
                "França IA ativada no simulador. O e-mail usa este motor ao preparar respostas.",
              );
          }}
        >
          <BrainCircuit size={16} />
          {state.config.provider === "França IA"
            ? "Ativa no simulador"
            : "Ativar no simulador"}
        </Button>
      </Header>
      <div className="info-banner">
        <BrainCircuit size={21} />
        <span>
          Este motor combina um classificador Naive Bayes treinável, regras
          comerciais e busca lexical em respostas aprovadas. Funciona sem API
          paga. Não é um modelo de linguagem treinado do zero e não aprende
          sozinho com mensagens de clientes.
        </span>
      </div>
      <div className="two-col">
        <section className="card gf-pad">
          <h2>Testar e ensinar intenções</h2>
          <label className="field">
            Mensagem de exemplo
            <textarea
              maxLength={4000}
              rows={4}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <div className="gf-actions">
            <Button
              disabled={busy || !text.trim()}
              onClick={async () => {
                const result = await act({ action: "gf_ai_test", text });
                if (result) setTest(result);
              }}
            >
              Testar interpretação
            </Button>
          </div>
          {test && (
            <div className="gf-result">
              <b>{intentions[String(test.intent)] || String(test.intent)}</b>
              <p>
                Método: {String(test.method)} · pontuação relativa:{" "}
                {String(test.score)}
              </p>
              <small>
                A pontuação não representa uma probabilidade calibrada de
                acerto.
              </small>
              <p>{String(test.answer)}</p>
            </div>
          )}
          <label className="field">
            Intenção correta
            <select
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            >
              {Object.entries(intentions).map(([value, title]) => (
                <option key={value} value={value}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={busy || text.trim().length < 2}
            onClick={async () => {
              if (await act({ action: "gf_example", text, label })) {
                setText("");
                setTest(null);
                notify?.(
                  "Exemplo aprovado. Clique em Treinar para publicar uma nova versão.",
                );
              }
            }}
          >
            <Check size={15} />
            Aprovar exemplo
          </Button>
          <div className="gf-actions">
            <Button
              disabled={busy}
              onClick={async () => {
                const result = await act({ action: "gf_ai_export" });
                if (result) {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(result, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "franca-ia-modelo-base.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }
              }}
            >
              Exportar modelo e base
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                const result = await act({ action: "gf_train" });
                if (result)
                  notify?.(
                    `Modelo versão ${result.version} treinado com ${result.examples} exemplos.`,
                  );
              }}
            >
              Treinar e publicar versão
            </Button>
          </div>
          <p>
            {data.model
              ? "Modelo v" + data.model.id + " · " + date(data.model.created)
              : "Modelo inicial com exemplos de partida."}{" "}
            · {data.examples.length} exemplo(s) adicional(is) listado(s).
          </p>
          {data.model && (
            <details>
              <summary>Verificações fixas desta versão</summary>
              {(
                JSON.parse(data.model.evaluation) as {
                  text: string;
                  expected: string;
                  intent: string;
                }[]
              ).map((row, index) => (
                <p key={index}>
                  {row.expected === row.intent ? "✓" : "⚠"} {row.text}:{" "}
                  {row.intent} (esperado: {row.expected})
                </p>
              ))}
              <small>
                Conjunto pequeno de verificações. Não mede desempenho em
                clientes reais.
              </small>
            </details>
          )}
        </section>
        <section className="card gf-pad">
          <h2>Base de respostas aprovadas</h2>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (await act({ action: "gf_knowledge", question, answer })) {
                setQuestion("");
                setAnswer("");
              }
            }}
          >
            <label className="field">
              Pergunta / palavras-chave
              <input
                required
                maxLength={1000}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </label>
            <label className="field">
              Resposta aprovada
              <textarea
                required
                rows={4}
                maxLength={3000}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy} variant="primary">
              Adicionar à base
            </Button>
          </form>
          {data.knowledge.map((item) => (
            <article className="gf-letter" key={item.id}>
              <b>{item.question}</b>
              <p>{item.answer}</p>
              <Button
                variant="icon"
                title="Remover resposta aprovada"
                disabled={busy}
                onClick={() => act({ action: "gf_knowledge", remove: item.id })}
              >
                <Trash2 size={15} />
              </Button>
            </article>
          ))}
        </section>
      </div>
      <section className="card gf-pad">
        <h2>Fluxo comercial</h2>
        <p>
          Apresentação → relato literal → objetivo → prazo → convite →
          disponibilidade → confirmação. Pedidos de atendimento humano pausam a
          SDR; pedidos de não contato bloqueiam novos envios e encerram
          cadências.
        </p>
        <p>
          Use Conversas para simular. No modo assistido de Canais e conexões, a
          França IA prepara rascunhos para você revisar e enviar. Preços,
          promessas e casos comerciais devem ser cadastrados e aprovados na base
          antes de serem usados.
        </p>
      </section>
    </>
  );
}
```

## frontend/src/Workplace.tsx

```tsx
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  Check,
  GripVertical,
  Mail,
  MoreHorizontal,
  Plus,
  Send,
  Target,
  Users,
} from "lucide-react";
import { api, csv, date } from "./api";
import { Avatar, Button, Empty, Header, Modal, NewButton } from "./components";
import { FrancaAI, Integrations } from "./Platform";
import { can, commercialStage, type Action, type Lead, type State, type User } from "./types";

type Props = { state: State; act: Action; busy: boolean };
const stages: Record<string, string> = {
  new: "Novos",
  contacted: "Contatados",
  qualified: "Qualificados",
  meeting: "Reunião",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};
const tones = ["blue", "amber", "violet", "cyan", "violet", "green", "red"];
export const stageOf = commercialStage;

export function Overview({
  state,
  open,
  navigate,
  newContact,
}: {
  state: State;
  open: (id: number) => void;
  navigate: (page: import("./types").Page) => void;
  newContact: () => void;
}) {
  const won = state.leads.filter((l) => stageOf(state, l) === "won").length;
  const due = state.leads
    .filter((l) => l.followup && l.followup <= state.now && !l.blocked)
    .sort((a, b) => a.followup.localeCompare(b.followup));
  const upcoming = state.meetings
    .filter((m) => m.start >= state.now)
    .sort((a, b) => a.start.localeCompare(b.start));
  const cards = [
    ["Contatos", state.leads.length, Users],
    [
      "Qualificados",
      state.leads.filter((l) =>
        ["qualified", "meeting", "proposal"].includes(stageOf(state, l)),
      ).length,
      Target,
    ],
    ["Reuniões futuras", upcoming.length, CalendarCheck],
    ["Vendas registradas", won, BarChart3],
  ] as const;
  return (
    <>
      <Header
        title="Visão geral"
        description={
          state.user?.role === "manager"
            ? "Sua operação comercial."
            : "Sua carteira de clientes."
        }
      >
        {can(state, "create") && <NewButton onClick={newContact} />}
      </Header>
      <div className="work-stats">
        {cards.map(([label, value, Icon]) => (
          <article className="card" key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <b>{value}</b>
          </article>
        ))}
      </div>
      <div className="work-home-grid">
        <section className="card work-pad">
          <div className="work-title">
            <h2>Funil comercial</h2>
            <Button variant="text" onClick={() => navigate("pipeline")}>
              Abrir funil <ArrowUpRight size={15} />
            </Button>
          </div>
          <div className="compact-funnel">
            {Object.entries(stages).map(([key, label], i) => {
              const count = state.leads.filter(
                (l) => stageOf(state, l) === key,
              ).length;
              return (
                <div key={key}>
                  <span>
                    <i className={"tiny-dot " + tones[i]} />
                    {label}
                  </span>
                  <div className="funnel-track">
                    <i
                      style={{
                        width: state.leads.length
                          ? `${Math.max(count ? 2 : 0, (100 * count) / state.leads.length)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </section>
        <section className="card work-pad">
          <div className="work-title">
            <h2>Retornos pendentes</h2>
            <span className="count-badge">{due.length}</span>
          </div>
          {due.length ? (
            due.slice(0, 5).map((l) => (
              <button
                className="work-list-row"
                key={l.id}
                onClick={() => open(l.id)}
              >
                <Avatar name={l.name || l.company} />
                <span>
                  <b>{l.name || l.company}</b>
                  <small>{date(l.followup)}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))
          ) : (
            <Empty
              title="Tudo em dia"
              description="Seus retornos aparecerão aqui."
            />
          )}
        </section>
      </div>
      <section className="card work-pad">
        <div className="work-title">
          <h2>Próximas reuniões</h2>
          <Button variant="text" onClick={() => navigate("agenda")}>
            Ver agenda <ArrowUpRight size={15} />
          </Button>
        </div>
        {upcoming.length ? (
          upcoming.slice(0, 4).map((m) => (
            <button
              className="work-list-row"
              key={m.id}
              onClick={() => open(m.lead_id)}
            >
              <CalendarCheck size={20} />
              <span>
                <b>{m.name || m.company}</b>
                <small>{date(m.start)}</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))
        ) : (
          <p>Nenhuma reunião agendada.</p>
        )}
      </section>
    </>
  );
}

export function SalesPipeline({
  state,
  act,
  busy,
  open,
  newContact,
}: Props & { open: (id: number) => void; newContact: () => void }) {
  const [drag, setDrag] = useState<number | null>(null),
    [over, setOver] = useState(""),
    [q, setQ] = useState(""),
    [owner, setOwner] = useState("");
  const labels = state.team?.stage_labels || stages;
  const rows = state.leads.filter(
    (l) =>
      (l.name + " " + l.company + " " + l.contact)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!owner || state.team?.assignments[l.id] === Number(owner)),
  );
  async function move(id: number, key: string) {
    if (!busy && can(state, "move"))
      await act({ action: "team_move", id, stage: key });
    setDrag(null);
    setOver("");
  }
  return (
    <>
      <Header
        title="Funil comercial"
        description="Arraste os contatos entre as etapas."
      >
        {can(state, "create") && <NewButton onClick={newContact} />}
      </Header>
      <div className="toolbar work-filter">
        <input
          aria-label="Buscar no funil"
          placeholder="Buscar contato…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {state.user?.role === "manager" && (
          <select
            aria-label="Filtrar responsável"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            {state.team?.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="sales-board">
        {Object.entries(labels).map(([key, label], index) => {
          const leads = rows.filter((l) => stageOf(state, l) === key);
          return (
            <section
              key={key}
              className={
                "sales-column " +
                tones[index] +
                " " +
                (over === key ? "drop-target" : "")
              }
              onDragOver={(e) => {
                if (drag !== null && !busy) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOver(key);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag !== null) void move(drag, key);
              }}
            >
              <header>
                <span>
                  <i className="tiny-dot" />
                  {label}
                </span>
                <b>{leads.length}</b>
              </header>
              <div className="sales-cards">
                {leads.map((l) => (
                  <article
                    className={
                      "sales-lead " + (drag === l.id ? "dragging" : "")
                    }
                    key={l.id}
                    draggable={!busy && can(state, "move") && !l.blocked}
                    onDragStart={(e) => {
                      setDrag(l.id);
                      e.dataTransfer.setData("text/plain", String(l.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver("");
                    }}
                  >
                    <div className="sales-lead-title">
                      <button onClick={() => open(l.id)}>
                        <b>{l.name || l.company}</b>
                      </button>
                      <GripVertical size={15} />
                    </div>
                    <small>{l.company || "Sem empresa"}</small>
                    <small>{l.contact || "Sem contato"}</small>
                    {Boolean(l.blocked || l.paused) && (
                      <span
                        className={"status " + (l.blocked ? "red" : "amber")}
                      >
                        {l.blocked ? "Não contatar" : "IA pausada"}
                      </span>
                    )}
                    <footer>
                      <span>
                        {state.workspace.meta[l.id]?.owner || state.user?.name}
                      </span>
                      <Button
                        variant="icon"
                        title="Abrir contato"
                        onClick={() => open(l.id)}
                      >
                        <ArrowUpRight size={15} />
                      </Button>
                    </footer>
                    <select
                      aria-label={"Mover " + (l.name || l.company)}
                      value={key}
                      disabled={
                        busy || !can(state, "move") || Boolean(l.blocked)
                      }
                      onChange={(e) => void move(l.id, e.target.value)}
                    >
                      {Object.entries(labels).map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
                {!leads.length && <p className="sales-empty">Nenhum contato</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

type Performance = {
  user: User;
  leads: number;
  wins: number;
  activities: number;
  moves: number;
  contacts_worked: number;
  overdue: number;
  meetings: number;
  last_activity: string;
  conversion: number;
};
type Report = {
  rows: Performance[];
  audit: {
    id: number;
    created: string;
    action: string;
    lead_id: number | null;
    actor: string;
    contact: string | null;
    detail: string;
  }[];
  start: string;
  end: string;
};
const auditLabels: Record<string, string> = {
  wa_send: "Enviou mensagem pelo WhatsApp",
  wa_test: "Testou mensagem de WhatsApp",
  wa_connect: "Iniciou conexão de WhatsApp",
  wa_disconnect: "Desconectou WhatsApp",
  wa_connection_create: "Cadastrou conexão de WhatsApp",
  wa_connection_assign: "Alterou responsável pelo WhatsApp",
  team_move: "Mudou etapa",
  team_assign: "Distribuiu contato",
  gf_profile: "Salvou contato",
  create: "Cadastrou contato",
  notes: "Salvou acompanhamento",
  gf_mail_send: "Envio de e-mail",
  gf_mail_draft: "Preparou e-mail",
  send: "Simulação de conversa",
  retry: "Simulação de resposta",
  gf_book: "Reservou reunião",
  cancel: "Cancelou reunião",
  block: "Bloqueou contato",
  team_user_create: "Cadastrou funcionário",
  team_user_update: "Alterou acesso",
  team_user_password: "Redefiniu senha",
  config: "Ajustou agente",
  gf_import_commit: "Importou contatos",
  pause: "Pausou / retomou IA",
};
export function Management({ state, act, busy }: Props) {
  const [tab, setTab] = useState("performance"),
    [report, setReport] = useState<Report | null>(null),
    [failure, setFailure] = useState(""),
    [revision, setRevision] = useState(0),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<User | null>(null),
    [reset, setReset] = useState<User | null>(null),
    [assignments, setAssignments] = useState<Record<string, string>>({}),
    [query, setQuery] = useState(""),
    [selectedIds,setSelectedIds]=useState<number[]>([]),
    [batchOwner,setBatchOwner]=useState(""),
    [loading,setLoading]=useState(false);
  const today = state.now.slice(0, 10),
    [start, setStart] = useState(today.slice(0, 8) + "01"),
    [end, setEnd] = useState(today);
  useEffect(() => {
    let active = true;
    setFailure("");
    setLoading(true);
    setReport(null);
    api<Report>("/api/action", { action: "team_management", start, end })
      .then((r) => {
        if (active) {setReport(r);setLoading(false);}
      })
      .catch((e) => {
        if (active) {setFailure(e.message);setLoading(false);}
      });
    return () => {
      active = false;
    };
  }, [start, end, state, revision]);
  const distributionRows=state.leads.filter(l=>(l.name+' '+l.company).toLowerCase().includes(query.toLowerCase()));
  const selectedVisible=selectedIds.filter(id=>state.leads.some(l=>l.id===id));
  const selectable=distributionRows.slice(0,500).map(l=>l.id);
  const allSelected=selectable.length>0&&selectable.every(id=>selectedVisible.includes(id));
  async function submitUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const result = await act(
      editing
        ? {
            action: "team_user_update",
            user_id: editing.id,
            permissions: f.getAll("permissions"),
            active: f.get("active") === "on",
            target: Number(f.get("target")),
          }
        : {
            action: "team_user_create",
            name: f.get("name"),
            username: f.get("username"),
            password: f.get("password"),
            permissions: f.getAll("permissions"),
          },
    );
    if (result) {
      setAdding(false);
      setEditing(null);
      setRevision((v) => v + 1);
    }
  }
  return (
    <>
      <Header title="Equipe" description="Gestão comercial e acessos." />
      <div className="work-tabs">
        {[
          ["performance", "Desempenho"],
          ["users", "Usuários"],
          ["assign", "Distribuição"],
          ["audit", "Atividades"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {failure&&<p role="alert" className="gf-error">{failure}</p>}
      {loading&&['performance','audit'].includes(tab)&&<p role="status">Atualizando indicadores…</p>}
      {tab === "performance" && (
        <>
          <div className="toolbar work-filter">
            <label>
              De
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <Button
              disabled={!report||loading||Boolean(failure)}
              onClick={() =>
                report &&
                csv(
                  "equipe-grupo-franca.csv",
                  [
                    "Pessoa",
                    "Carteira atual",
                    "Contatos trabalhados",
                    "Reuniões reais",
                    "Vendas registradas",
                    "Retornos vencidos",
                  ],
                  report.rows.map((r) => [
                    r.user.name,
                    r.leads,
                    r.contacts_worked,
                    r.meetings,
                    r.wins,
                    r.overdue,
                  ]),
                )
              }
            >
              Exportar
            </Button>
          </div>

          {report&&<><div className="work-stats">
            {[
              [
                "Vendas registradas",
                report?.rows.reduce((n, r) => n + r.wins, 0) || 0,
              ],
              [
                "Contatos trabalhados",
                report?.rows.reduce((n, r) => n + r.contacts_worked, 0) || 0,
              ],
              [
                "Reuniões reais",
                report?.rows.reduce((n, r) => n + r.meetings, 0) || 0,
              ],
              [
                "Retornos vencidos",
                report?.rows.reduce((n, r) => n + r.overdue, 0) || 0,
              ],
            ].map(([label, value]) => (
              <article className="card" key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </article>
            ))}
          </div>
          <section className="card work-pad">
            <h2>Resultados por pessoa</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Pessoa</th>
                    <th>Carteira atual</th>
                    <th>Trabalhados</th>
                    <th>Reuniões reais</th>
                    <th>Vendas</th>
                    <th>Retornos vencidos</th>
                    <th>Meta mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.rows.map((r, i) => (
                    <tr key={r.user.id}>
                      <td>{i + 1}</td>
                      <td>
                        <b>{r.user.name}</b>
                        <small className="owner">
                          {r.user.active ? "Ativo" : "Inativo"}
                        </small>
                      </td>
                      <td>{r.leads}</td>
                      <td>{r.contacts_worked}</td>
                      <td>{r.meetings}</td>
                      <td>
                        <b>{r.wins}</b>
                      </td>
                      <td>{r.overdue}</td>
                      <td>{r.user.target || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="work-explanation">
              <summary>Como os números são calculados</summary>
              <p>
                Ranking por vendas registradas e contatos trabalhados no
                período. Vendas são ganhos manuais ainda ativos, na carteira
                atual da pessoa que os registrou; reaberturas são excluídas.
                Reuniões usam reservas reais da carteira atual. Simulações não
                contam como vendas ou reuniões reais. A meta é mensal; compare
                com o mês completo. Retornos e carteira refletem a situação
                atual. Esses registros não medem tempo de trabalho nem
                produtividade fora da plataforma.
              </p>
            </details>
          </section></>}
        </>
      )}
      {tab === "users" && (
        <section className="card work-pad">
          <div className="work-title">
            <h2>Usuários</h2>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus size={16} />
              Novo funcionário
            </Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Usuário</th>
                  <th>Função</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {state.team?.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.name}</b>
                    </td>
                    <td>{u.username}</td>
                    <td>{u.role === "manager" ? "Gerente" : "Vendedor"}</td>
                    <td>{u.active ? "Ativo" : "Inativo"}</td>
                    <td>
                      {u.role === "seller" && (
                        <div className="row-actions">
                          <Button disabled={busy} onClick={() => setEditing(u)}>
                            Acesso e meta
                          </Button>
                          <Button disabled={busy} onClick={() => setReset(u)}>
                            Nova senha
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "assign" && (
        <section className="card work-pad">
          <div className="work-title">
            <h2>Distribuir contatos</h2>
            <input
              aria-label="Buscar para distribuir"
              placeholder="Buscar contato…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar work-filter">
            <span>{selectedVisible.length} contato(s) selecionado(s)</span>
            <select aria-label="Responsável do lote" value={batchOwner} disabled={busy} onChange={e=>setBatchOwner(e.target.value)}>
              <option value="">Escolha o responsável</option>
              {state.team?.users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <Button variant="primary" disabled={busy||!selectedVisible.length||!batchOwner} onClick={async()=>{
              if(await act({action:'team_assign_many',ids:selectedVisible,user_id:Number(batchOwner)})){setSelectedIds([]);setAssignments({});}
            }}>Atribuir selecionados</Button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Selecionar contatos filtrados" disabled={busy||!selectable.length} checked={allSelected} onChange={e=>setSelectedIds(e.target.checked?[...new Set([...selectedVisible,...selectable])].slice(0,500):selectedVisible.filter(id=>!selectable.includes(id)))}/></th>
                  <th>Contato</th>
                  <th>Responsável atual</th>
                  <th>Atribuir a</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {distributionRows                  .map((l) => (
                    <tr key={l.id}>
                      <td><input type="checkbox" aria-label={'Selecionar '+(l.name||l.company)} checked={selectedVisible.includes(l.id)} disabled={busy||(!selectedVisible.includes(l.id)&&selectedVisible.length>=500)} onChange={e=>setSelectedIds(e.target.checked?[...selectedVisible,l.id]:selectedVisible.filter(id=>id!==l.id))}/></td>
                      <td>
                        <b>{l.name || l.company}</b>
                        <small className="owner">{l.company}</small>
                      </td>
                      <td>
                        {state.workspace.meta[l.id]?.owner || "Não atribuído"}
                      </td>
                      <td>
                        <select
                          aria-label={
                            "Responsável por " + (l.name || l.company)
                          }
                          value={
                            assignments[l.id] ??
                            String(state.team?.assignments[l.id] || "")
                          }
                          onChange={(e) =>
                            setAssignments((v) => ({
                              ...v,
                              [l.id]: e.target.value,
                            }))
                          }
                        >
                          {state.team?.users
                            .filter((u) => u.active)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <Button
                          disabled={
                            busy ||
                            !assignments[l.id] ||
                            Number(assignments[l.id]) ===
                              state.team?.assignments[l.id]
                          }
                          onClick={async () => {
                            if (
                              await act({
                                action: "team_assign",
                                id: l.id,
                                user_id: Number(assignments[l.id]),
                              })
                            )
                              setAssignments((v) => {
                                const n = { ...v };
                                delete n[l.id];
                                return n;
                              });
                          }}
                        >
                          Salvar
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <small>Selecione até 500 contatos por lote. Atribuições alteram a carteira de acesso do vendedor.</small>
          {!state.leads.length && (
            <Empty
              title="Nenhum contato"
              description="Cadastre ou importe os primeiros contatos."
            />
          )}
        </section>
      )}
      {tab === "audit" && (
        <section className="card work-pad">
          <h2>Atividades no período selecionado</h2>
          <div className="toolbar work-filter">
            <label>
              De
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pessoa</th>
                  <th>Atividade</th>
                  <th>Contato</th>
                </tr>
              </thead>
              <tbody>
                {report?.audit.map((a) => (
                  <tr key={a.id}>
                    <td>{date(a.created)}</td>
                    <td>{a.actor}</td>
                    <td>
                      {auditLabels[a.action] || "Operação interna"}
                      {a.action === "team_move" && (
                        <small className="owner">
                          {stages[JSON.parse(a.detail).from]} →{" "}
                          {stages[JSON.parse(a.detail).to]}
                        </small>
                      )}
                    </td>
                    <td>{a.contact || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small>Até 100 atividades recentes no período.</small>
        </section>
      )}
      {(adding || editing) && (
        <Modal
          title={editing ? "Acesso e meta" : "Novo funcionário"}
          close={() => {
            setAdding(false);
            setEditing(null);
          }}
          busy={busy}
        >
          <form onSubmit={submitUser}>
            {!editing && (
              <div className="form-grid">
                <label>
                  Nome
                  <input name="name" required maxLength={100} />
                </label>
                <label>
                  Usuário
                  <input
                    name="username"
                    required
                    minLength={3}
                    maxLength={60}
                    autoComplete="off"
                  />
                </label>
                <label className="full">
                  Senha temporária
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </label>
                <p className="full">
                  O funcionário definirá uma nova senha no primeiro acesso.
                </p>
              </div>
            )}
            {editing && (
              <div className="form-grid">
                <label>
                  Meta mensal de vendas
                  <input
                    name="target"
                    type="number"
                    min={0}
                    max={100000}
                    defaultValue={editing.target}
                  />
                </label>
                <label className="work-check">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={Boolean(editing.active)}
                  />
                  Acesso ativo
                </label>
              </div>
            )}
            <fieldset className="work-permissions">
              <legend>Permissões</legend>
              {Object.entries(state.team?.permission_labels || {}).map(
                ([key, label]) => (
                  <label key={key}>
                    <input
                      name="permissions"
                      type="checkbox"
                      value={key}
                      defaultChecked={
                        editing
                          ? editing.permissions.includes(key)
                          : !["import", "cadence"].includes(key)
                      }
                    />
                    {label}
                  </label>
                ),
              )}
            </fieldset>
            <div className="modal-actions">
              <Button
                onClick={() => {
                  setAdding(false);
                  setEditing(null);
                }}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={busy}>
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {reset && (
        <Modal
          title={"Nova senha · " + reset.name}
          close={() => setReset(null)}
          busy={busy}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await act({
                  action: "team_user_password",
                  user_id: reset.id,
                  password: f.get("password"),
                })
              )
                setReset(null);
            }}
          >
            <label>
              Senha temporária
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
            <p>
              O usuário será desconectado e precisará trocar a senha ao entrar.
            </p>
            <div className="modal-actions">
              <Button type="submit" variant="primary" disabled={busy}>
                Redefinir senha
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function FixedAgent({ state, act, busy }: Props) {
  const [tab, setTab] = useState("agent");
  const [error, setError] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (await act({ action: "config", ...values }))
      setError("Configuração salva.");
  }
  return (
    <>
      <Header
        title="Configurações"
        description="Agente padrão e conexões do Grupo França."
      />
      <div className="work-tabs">
        {[
          ["agent", "Agente comercial"],
          ["channels", "Conexões"],
        ].map(([k, l]) => (
          <button
            className={tab === k ? "active" : ""}
            key={k}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "agent" ? (
        <>
          <section className="card work-pad fixed-agent">
            <div className="work-title">
              <h2>França IA</h2>
              <span className="status green">
                <Check size={13} />
                Agente padrão
              </span>
            </div>
            <p>
              Apresentar o Grupo França, entender a necessidade, qualificar o
              interesse e encaminhar para reunião.
            </p>
            <form onSubmit={save}>
              <div className="form-grid">
                {[
                  ["outbound", "Apresentação na prospecção"],
                  ["inbound", "Recepção de interessados"],
                  ["question", "Pergunta sobre a necessidade"],
                  ["invite", "Convite para reunião"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <textarea
                      name={key}
                      required
                      maxLength={10000}
                      rows={3}
                      defaultValue={String(
                        state.config[key as keyof typeof state.config],
                      )}
                    />
                  </label>
                ))}
                <label>
                  Início do atendimento
                  <input
                    name="start"
                    type="number"
                    min={0}
                    max={23}
                    defaultValue={state.config.start}
                  />
                </label>
                <label>
                  Fim do atendimento
                  <input
                    name="end"
                    type="number"
                    min={1}
                    max={24}
                    defaultValue={state.config.end}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <span role="status">{error}</span>
                <Button type="submit" variant="primary" disabled={busy}>
                  Salvar agente
                </Button>
              </div>
            </form>
          </section>
          <details className="card work-pad advanced-agent">
            <summary>Base de conhecimento e ajustes avançados</summary>
            <FrancaAI state={state} act={act} busy={busy} />
          </details>
        </>
      ) : (
        <Integrations state={state} act={act} busy={busy} />
      )}
    </>
  );
}

type Letter = {
  id: string;
  lead_id: number;
  direction: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  error: string;
  created: string;
};
export function MailDesk({ state, act, busy }: Props) {
  const [selected, setSelected] = useState(""),
    [review, setReview] = useState<Letter | null>(null),
    [startReal, setStartReal] = useState(false);
  const letters = (
    (state as State & { commercial?: { mail: Letter[] } }).commercial?.mail ||
    []
  ).filter((m) => !selected || m.lead_id === Number(selected));
  return (
    <>
      <Header title="E-mails" description="Mensagens da sua carteira." />
      <section className="card work-pad">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            if (
              await act({
                action: "gf_mail_draft",
                id: Number(selected),
                mode: "manual",
                subject: f.get("subject"),
                body: f.get("body"),
              })
            )
              form.reset();
          }}
        >
          <div className="form-grid">
            <label>
              Contato
              <select
                required
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Selecione um contato</option>
                {state.leads
                  .filter((l) => !l.blocked)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name || l.company}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Assunto
              <input name="subject" maxLength={200} />
            </label>
            <label className="full">
              Mensagem
              <textarea name="body" rows={4} maxLength={16000} />
            </label>
          </div>
          <div className="gf-actions">
            <Button
              disabled={!selected || busy || !can(state, "message")}
              onClick={() => setStartReal(true)}
            >
              Usar na operação real
            </Button>
            <Button
              type="submit"
              disabled={!selected || busy || !can(state, "message")}
            >
              Criar rascunho
            </Button>
            <Button
              variant="primary"
              disabled={!selected || busy || !can(state, "message")}
              onClick={() =>
                void act({
                  action: "gf_mail_draft",
                  id: Number(selected),
                  mode: "ai",
                })
              }
            >
              Preparar com França IA
            </Button>
          </div>
        </form>
      </section>
      <section className="card work-pad">
        <h2>Mensagens</h2>
        {letters.map((m) => (
          <article className="gf-letter" key={m.id}>
            <div className="work-title">
              <b>{m.recipient}</b>
              <span className="status neutral">
                {{
                  sent: "Aceito pelo SMTP",
                  draft: "Rascunho",
                  received: "Recebido",
                  failed: "Falhou",
                  unknown: "Envio incerto",
                  cancelled: "Cancelado",
                }[m.status] || m.status}
              </span>
            </div>
            <b>{m.subject}</b>
            <small>{date(m.created)}</small>
            <p className="gf-mail-body">{m.body}</p>
            {m.error && <p className="gf-error">{m.error}</p>}
            {["draft", "failed"].includes(m.status) && (
              <div className="gf-actions">
                <Button
                  variant="primary"
                  disabled={busy || !can(state, "message")}
                  onClick={() => setReview(m)}
                >
                  <Send size={15} />
                  Revisar e enviar
                </Button>
                <Button
                  disabled={busy || !can(state, "message")}
                  onClick={() =>
                    void act({ action: "gf_mail_cancel", mail: m.id })
                  }
                >
                  Cancelar rascunho
                </Button>
              </div>
            )}
            {m.status === "unknown" && (
              <small>Peça ao gerente para conferir o envio.</small>
            )}
          </article>
        ))}
        {!letters.length && (
          <Empty
            title="Nenhuma mensagem"
            description="Os e-mails recebidos e preparados aparecerão aqui."
          />
        )}
      </section>
      {review && (
        <Modal
          title="Revisar e enviar"
          close={() => setReview(null)}
          busy={busy}
        >
          <p>Para: {review.recipient}</p>
          <h3>{review.subject}</h3>
          <p className="gf-mail-body">{review.body}</p>
          <div className="modal-actions">
            <Button onClick={() => setReview(null)} disabled={busy}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act({
                    action: "gf_mail_send",
                    mail: review.id,
                    confirmed: true,
                  })
                )
                  setReview(null);
              }}
            >
              Enviar e-mail
            </Button>
          </div>
        </Modal>
      )}
      {startReal && (
        <Modal
          title="Usar na operação real"
          description="O histórico será preservado. Relato, objetivo, prazo e reservas de teste serão reiniciados. O simulador ficará desativado para este contato."
          close={() => setStartReal(false)}
          busy={busy}
        >
          <div className="modal-actions">
            <Button disabled={busy} onClick={() => setStartReal(false)}>
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await act({ action: "gf_start_real", id: Number(selected) })
                )
                  setStartReal(false);
              }}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
```
