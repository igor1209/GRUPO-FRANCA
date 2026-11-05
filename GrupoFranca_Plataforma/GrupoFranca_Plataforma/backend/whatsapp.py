"""Multi-account WhatsApp adapter. Local-only IPC, account permissions and explicit sends.
No chat UI, message bodies/history import, cold outreach or automatic replies.
"""
import concurrent.futures
import json
import re
import secrets
import shutil
import subprocess
import threading
import time
from pathlib import Path

from .core import stamp
from .team import TeamStore, AccessError

TEMPLATES = {
    'confirmation': 'Olá, {{nome_contato}}. Somos da {{empresa}}. Agradecemos pela conversa e pelo interesse em conhecer nosso trabalho. Podemos continuar o atendimento por aqui?',
    'scheduling': 'Olá, {{nome_contato}}. Podemos agendar uma conversa para entender o cenário da sua empresa e avaliar como o Grupo França pode contribuir para a aquisição de clientes. Qual dia e horário funcionam melhor para você?',
    'qualification': 'Olá, {{nome_contato}}. Para direcionarmos nossa conversa, qual é hoje o principal desafio da {{empresa_contato}} na aquisição de clientes?',
    'return': 'Olá, {{nome_contato}}. Somos da {{empresa}}. Estamos retomando nosso contato para saber se podemos dar continuidade à conversa sobre a aquisição de clientes. Este é um bom momento para conversarmos?',
}
VARIABLES = {'nome_contato', 'empresa', 'empresa_contato', 'agente'}


def phone(value):
    value=str(value or '').strip()
    if '@' in value: raise ValueError('Cadastre um telefone com DDD no contato.')
    digits=re.sub(r'\D', '', value)
    if not value.startswith('+') and len(digits) in (10,11): digits='55'+digits
    if not re.fullmatch(r'[1-9]\d{9,14}',digits): raise ValueError('Telefone inválido. Use DDI e DDD.')
    return digits


def schema(store):
    store.db.executescript('''
    CREATE TABLE IF NOT EXISTS wa_connections (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id INTEGER NOT NULL REFERENCES team_users(id),
      reconnect INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wa_templates (
      connection_id TEXT NOT NULL REFERENCES wa_connections(id), kind TEXT NOT NULL, body TEXT NOT NULL,
      PRIMARY KEY(connection_id,kind));
    CREATE TABLE IF NOT EXISTS wa_sends (
      id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES wa_connections(id),
      lead_id INTEGER NOT NULL REFERENCES leads(id), actor_id INTEGER NOT NULL REFERENCES team_users(id),
      kind TEXT NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL, message_id TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '', created TEXT NOT NULL, ack INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS wa_receipts (
      connection_id TEXT NOT NULL, message_id TEXT NOT NULL, lead_id INTEGER NOT NULL, created TEXT NOT NULL,
      PRIMARY KEY(connection_id,message_id));
    ''')


class Bridge:
    def __init__(self, root, base, db):
        self.root,self.base,self.db=Path(root),Path(base),Path(db)
        self.process=None
        self.pending={}
        self.statuses={}
        self.lock=threading.RLock()
        self.error='Conexão ainda não iniciada.'

    def start(self):
        with self.lock:
            if self.process and self.process.poll() is None:return
            if not shutil.which('node') or not (self.root/'whatsapp_bridge/node_modules/whatsapp-web.js').exists():
                raise ValueError('Execute configurar_whatsapp.bat e reinicie a plataforma para instalar o conector.')
            import os
            env={**os.environ,'GF_WA_SESSION_DIR':str(self.base/'whatsapp_sessions')}
            flags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0
            proc=subprocess.Popen([shutil.which('node'),str(self.root/'whatsapp_bridge/bridge.mjs')],
                cwd=self.root/'whatsapp_bridge',env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,text=True,encoding='utf-8',bufsize=1,creationflags=flags)
            self.process=proc
            self.error=''
            threading.Thread(target=self._read,args=(proc,),daemon=True).start()

    def _read(self,proc):
        try:
            for line in proc.stdout:
                if len(line)>100000:continue
                try:data=json.loads(line)
                except (ValueError,TypeError):continue
                if data.get('id'):
                    with self.lock:future=self.pending.pop(data['id'],None)
                    if future and not future.done():future.set_result(data)
                else:
                    try:self.event(data)
                    except Exception:pass  # Never log session data or third-party message payloads.
        finally:
            with self.lock:
                if self.process is proc:
                    self.error='Conector encerrado. Reinicie a conexão.'
                    for value in self.statuses.values():value.update(status='disconnected',qr='',qr_expires=0,number='')
                    for future in self.pending.values():
                        if not future.done():future.set_exception(ValueError(self.error))
                    self.pending.clear()

    def call(self,op,cid,**payload):
        self.start()
        request_id=secrets.token_hex(16)
        future=concurrent.futures.Future()
        with self.lock:
            self.pending[request_id]=future
            try:
                self.process.stdin.write(json.dumps(dict(id=request_id,op=op,connection=cid,**payload))+'\n')
                self.process.stdin.flush()
            except (BrokenPipeError,OSError):
                self.pending.pop(request_id,None)
                raise ValueError('Conector indisponível.') from None
        try:reply=future.result(timeout=75 if op=='disconnect' else 45)
        except concurrent.futures.TimeoutError:
            raise ValueError('Tempo de resposta excedido. Confira no WhatsApp antes de repetir um envio.') from None
        finally:
            with self.lock:self.pending.pop(request_id,None)
        if reply.get('error'):raise ValueError(reply['error'])
        return reply['result']

    def event(self,data):
        cid=data.get('connection','')
        if not re.fullmatch('[a-f0-9]{24}',cid):return
        if data.get('event')=='status':
            with self.lock:self.statuses[cid]={k:data.get(k,'') for k in ('status','number','qr','error','qr_expires')}
            return
        store=TeamStore(self.db)
        try:
            schema(store)
            connection=store.db.execute('SELECT * FROM wa_connections WHERE id=?',(cid,)).fetchone()
            if not connection:return
            mid=str(data.get('message_id',''))[:300]
            if not mid:return
            if data.get('event')=='ack':
                ack=int(data.get('ack',0))
                with store.db:
                    # WhatsApp ack -1=error, 1=server, 2=device, 3=read; do not regress on late events.
                    store.db.execute('UPDATE wa_sends SET ack=CASE WHEN ?=-1 THEN -1 ELSE max(ack,?) END WHERE connection_id=? AND message_id=?',(ack,ack,cid,mid))
            elif data.get('event')=='incoming':
                # Ignore previous history and all unknown/personal contacts.
                timestamp=float(data.get('timestamp',0))
                if abs(time.time()-timestamp)>300:return
                number=str(data.get('phone',''))
                matches=[]
                for lead in store.leads():
                    if lead['blocked']:continue
                    try:
                        if phone(lead['contact'])==number:matches.append(lead)
                    except ValueError:pass
                if len(matches)!=1:return
                lead=matches[0]
                owner=store.db.execute('SELECT user_id FROM team_assignments WHERE lead_id=?',(lead['id'],)).fetchone()
                user=store.db.execute('SELECT role,active FROM team_users WHERE id=?',(connection['owner_id'],)).fetchone()
                if not user or not user['active'] or (user['role']!='manager' and (not owner or owner[0]!=connection['owner_id'])):return
                with store.db:
                    cur=store.db.execute('INSERT OR IGNORE INTO wa_receipts VALUES (?,?,?,?)',(cid,mid,lead['id'],stamp()))
                    if cur.rowcount:
                        source=store.profile(lead['id'])['source'] or lead['origin']
                        store.db.execute('INSERT INTO gf_events(lead_id,kind,mode,acquisition,created) VALUES (?,?,?,?,?)',(lead['id'],'received','real',source,stamp()))
        finally:store.db.close()

    def stop(self):
        with self.lock:proc=self.process
        if proc and proc.poll() is None:
            try:proc.stdin.close();proc.wait(timeout=8)
            except (OSError,subprocess.TimeoutExpired):proc.terminate()
        with self.lock:self.statuses.clear()


def connection_for(store,user,cid,manager=False):
    row=store.db.execute('SELECT * FROM wa_connections WHERE id=?',(str(cid),)).fetchone()
    if not row:raise ValueError('Conexão não encontrada.')
    if manager and user['role']!='manager':raise AccessError('Apenas o gerente pode configurar conexões.')
    if user['role']!='manager' and row['owner_id']!=user['id']:raise AccessError('Esta conexão pertence a outro usuário.')
    return row


def render(store,cid,kind,lid):
    if kind not in TEMPLATES:raise ValueError('Modelo inválido.')
    lead=store.lead(lid)
    if not lead:raise ValueError('Contato não encontrado.')
    if lead['blocked']:raise ValueError('Contato bloqueado. O envio não é permitido.')
    row=store.db.execute('SELECT body FROM wa_templates WHERE connection_id=? AND kind=?',(cid,kind)).fetchone()
    text=row[0] if row else TEMPLATES[kind]
    values={'nome_contato':lead['name'],'empresa':'Grupo França','empresa_contato':lead['company'],'agente':'França IA'}
    def replace(match):
        key=match[1]
        if key not in values:raise ValueError('Variável não reconhecida: '+key)
        if not values[key].strip():raise ValueError('Preencha '+key+' no cadastro antes de enviar.')
        return values[key].strip()
    text=re.sub(r'\{\{\s*(\w+)\s*\}\}',replace,text)
    if '{{' in text or '}}' in text:raise ValueError('Há uma variável inválida na mensagem.')
    if not text.strip() or len(text)>4000:raise ValueError('A mensagem deve ter de 1 a 4.000 caracteres.')
    return phone(lead['contact']),text


def listing(store,user,bridge):
    schema(store)
    query='SELECT c.*,u.name AS owner_name FROM wa_connections c JOIN team_users u ON u.id=c.owner_id'
    args=()
    if user['role']!='manager':query+=' WHERE c.owner_id=?';args=(user['id'],)
    rows=[]
    with bridge.lock:
        for row in store.db.execute(query+' ORDER BY c.created',args):
            entry=dict(row)
            status=dict(bridge.statuses.get(row['id'],{'status':'disconnected','number':'','error':'','qr':'','qr_expires':0}))
            if status.get('qr_expires',0) and status['qr_expires']<time.time()*1000:status['qr']=''
            if user['role']!='manager':status.pop('qr',None)
            entry.update(status)
            entry['templates']={**TEMPLATES,**{r['kind']:r['body'] for r in store.db.execute('SELECT kind,body FROM wa_templates WHERE connection_id=?',(row['id'],))}}
            where='' if user['role']=='manager' else ' AND actor_id=? AND lead_id IN (SELECT lead_id FROM team_assignments WHERE user_id=?)'
            values=(row['id'],) if not where else (row['id'],user['id'],user['id'])
            entry['sends']=[dict(r) for r in store.db.execute('SELECT id,lead_id,kind,purpose,status,ack,error,created FROM wa_sends WHERE connection_id=?'+where+' ORDER BY created DESC LIMIT 10',values)]
            rows.append(entry)
    return {'connections':rows,'error':bridge.error if bridge.process and bridge.process.poll() is not None else ''}


def operation(store,user,bridge,op,data):
    schema(store)
    if op=='create':
        if user['role']!='manager':raise AccessError('Apenas o gerente pode adicionar conexões.')
        name=str(data.get('name','')).strip()
        if not 1<=len(name)<=60:raise ValueError('Informe um nome de até 60 caracteres.')
        uid=int(data.get('owner_id') or user['id'])
        if not store.db.execute('SELECT 1 FROM team_users WHERE id=? AND active=1',(uid,)).fetchone():raise ValueError('Usuário indisponível.')
        if store.db.execute('SELECT count(*) FROM wa_connections').fetchone()[0]>=10:raise ValueError('Limite local de 10 conexões atingido.')
        cid=secrets.token_hex(12)
        with store.db:store.db.execute('INSERT INTO wa_connections VALUES (?,?,?,0,?)',(cid,name,uid,stamp()))
        store.audit(user,'wa_connection_create',detail={'connection':cid})
        return {'ok':True,'id':cid}
    cid=str(data.get('connection',''))
    row=connection_for(store,user,cid,manager=op in ('connect','disconnect','assign','template'))
    if op=='assign':
        uid=int(data.get('owner_id',0))
        if not store.db.execute('SELECT 1 FROM team_users WHERE id=? AND active=1',(uid,)).fetchone():raise ValueError('Usuário indisponível.')
        with store.db:store.db.execute('UPDATE wa_connections SET owner_id=? WHERE id=?',(uid,cid))
        store.audit(user,'wa_connection_assign',detail={'connection':cid,'user_id':uid})
        return {'ok':True}
    if op in ('connect','disconnect'):
        result=bridge.call(op,cid)
        with bridge.lock:bridge.statuses[cid]=result
        with store.db:store.db.execute('UPDATE wa_connections SET reconnect=? WHERE id=?',(int(op=='connect'),cid))
        store.audit(user,'wa_'+op,detail={'connection':cid})
        return {'ok':True}
    if op=='template':
        kind=str(data.get('kind',''));body=str(data.get('body','')).strip()
        if kind not in TEMPLATES or not 1<=len(body)<=4000:raise ValueError('Modelo inválido ou acima de 4.000 caracteres.')
        keys=set(re.findall(r'\{\{\s*(\w+)\s*\}\}',body))
        remainder=re.sub(r'\{\{\s*(\w+)\s*\}\}','',body)
        if not keys<=VARIABLES or '{{' in remainder or '}}' in remainder:raise ValueError('Use as variáveis disponíveis no editor.')
        with store.db:store.db.execute('INSERT OR REPLACE INTO wa_templates VALUES (?,?,?)',(cid,kind,body))
        return {'ok':True}
    if op not in ('preview','send'):raise ValueError('Operação inválida.')
    if user['role']!='manager' and 'message' not in user['permissions']:raise AccessError('Você não tem permissão para enviar mensagens.')
    lid=int(data.get('lead_id',0));store.require_lead(user,lid)
    # A seller connection can only address that seller's portfolio, including when operated by manager.
    owner=store.db.execute('SELECT * FROM team_users WHERE id=?',(row['owner_id'],)).fetchone()
    assignment=store.db.execute('SELECT user_id FROM team_assignments WHERE lead_id=?',(lid,)).fetchone()
    if not owner or not owner['active']:raise ValueError('O responsável pela conexão está inativo.')
    if owner['role']!='manager' and (not assignment or assignment[0]!=row['owner_id']):raise AccessError('O contato não pertence ao responsável desta conexão.')
    kind=str(data.get('kind',''));number,text=render(store,cid,kind,lid)
    if op=='preview':
        import hashlib
        return {'phone':number,'text':text,'digest':hashlib.sha256((number+'\n'+text).encode()).hexdigest()}
    if data.get('confirmed') is not True:raise ValueError('Confirme o destinatário e o texto antes de enviar.')
    # Bind confirmation to exact server-rendered text; reject stale contact/template edits.
    import hashlib
    digest=hashlib.sha256((number+'\n'+text).encode()).hexdigest()
    if data.get('digest')!=digest:raise ValueError('O contato ou a mensagem mudou. Gere uma nova prévia.')
    request_id=str(data.get('request_id',''))
    if not re.fullmatch('[a-f0-9]{32}',request_id):raise ValueError('Identificador de envio inválido.')
    purpose=str(data.get('purpose','test'))
    if purpose not in ('test','operational'):raise ValueError('Finalidade inválida.')
    existing=store.db.execute('SELECT * FROM wa_sends WHERE id=?',(request_id,)).fetchone()
    if existing:
        if existing['connection_id']!=cid or existing['actor_id']!=user['id'] or existing['lead_id']!=lid:raise AccessError('Identificador indisponível.')
        return {'ok':existing['status']=='sent','status':existing['status'],'error':existing['error']}
    last=store.db.execute("SELECT created FROM wa_sends WHERE connection_id=? AND status IN ('sending','sent','unknown') ORDER BY created DESC LIMIT 1",(cid,)).fetchone()
    if last:
        from datetime import datetime
        if (datetime.fromisoformat(stamp())-datetime.fromisoformat(last[0])).total_seconds()<10:raise ValueError('Aguarde 10 segundos entre envios.')
    with store.db:
        store.db.execute('INSERT INTO wa_sends(id,connection_id,lead_id,actor_id,kind,purpose,status,created) VALUES (?,?,?,?,?,?,?,?)',(request_id,cid,lid,user['id'],kind,purpose,'sending',stamp()))
    try:
        result=bridge.call('send',cid,phone=number,text=text)
        status='sent' if result.get('ok') else ('failed' if result.get('not_sent') else 'unknown')
        error=result.get('error','')
        with store.db:
            store.db.execute('UPDATE wa_sends SET status=?,message_id=?,error=? WHERE id=?',(status,result.get('message_id',''),error,request_id))
        if status=='sent':
            if purpose=='operational':store.event(lid,'sent','real')
            store.audit(user,'wa_test' if purpose=='test' else 'wa_send',lid,{'purpose':purpose,'connection':cid})
        return {'ok':status=='sent','status':status,'error':error}
    except Exception:
        with store.db:store.db.execute("UPDATE wa_sends SET status='unknown',error='Envio sem confirmação. Confira no WhatsApp antes de repetir.' WHERE id=?",(request_id,))
        return {'ok':False,'status':'unknown','error':'Envio sem confirmação. Confira no WhatsApp antes de repetir.'}
