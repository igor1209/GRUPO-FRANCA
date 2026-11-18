"""Local FastAPI application. Run from the project root with python iniciar.py."""
import json
import os
import secrets
import shutil
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
from . import whatsapp, google_accounts, calendar_view

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
        key = BASE / 'private' / 'google.key'
        if key.exists():
            shutil.copy2(key,backup.with_suffix('.google.key'))
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

app = FastAPI(title='Grupo França Comercial', version='1.8.1', lifespan=lifespan,
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
    if request.url.path.startswith('/api') or request.url.path=='/oauth/google/callback': response.headers['Cache-Control'] = 'no-store'
    return response

@app.get('/api/session')
def session(request: Request):
    store=WorkspaceStore(DB)
    try:
        return {'token':TOKEN, 'version':'1.8.1',
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
    store = WorkspaceStore(DB)
    try:
        with service.lock:
            google_accounts.Vault(store).finish(code, state, error)
        return HTMLResponse('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Grupo França</title><body style="background:#0b0b0b;color:#eee;font:16px sans-serif;padding:40px"><h1>Google Calendar autorizado.</h1><p>Feche esta aba e atualize os dados na plataforma para testar a conexão.</p><a style="color:#8ab4ff" href="http://127.0.0.1:8780">Voltar à plataforma</a></body></html>')
    except Exception:
        return HTMLResponse('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body><h1>Autorização não concluída.</h1><p>Volte à plataforma e inicie a conexão novamente. Use a mesma conta Google das suas reservas e conceda as permissões de agenda. Se o problema persistir, peça ao administrador para conferir a integração.</p></body></html>', status_code=400)
    finally:
        store.db.close()

@app.get('/api/state')
def state(request: Request):
    store = WorkspaceStore(DB)
    try:
        google_accounts.bind(store,request.state.user)
        result=scoped_state(store,request.state.user)
        result.update(config=store.config(),phases=PHASES,now=now().isoformat(),
                      key_ready=bool(service.key or os.getenv('OPENAI_API_KEY')) if request.state.user['role']=='manager' else False)
        return result
    finally: store.db.close()

@app.get('/api/calendar')
def calendar_events(start: str, end: str, request: Request):
    store=WorkspaceStore(DB)
    try:
        user=request.state.user
        if user['role']!='manager' and 'book' not in user['permissions']: raise AccessError('Seu perfil não tem permissão para acessar a agenda.')
        google_accounts.bind(store,user)
        return calendar_view.events(store,user,start,end)
    except AccessError as exc: return JSONResponse({'error':str(exc)},403)
    except ValueError as exc: return JSONResponse({'error':str(exc)},400)
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
        vault=google_accounts.bind(store,user)
        if kind=='gf_google_config':
            vault.configure(data)
            return {'ok':True}
        if kind=='gf_google_authorize':
            return {'url':vault.begin(user,request.cookies.get('gf_session',''))}
        if kind=='gf_google_forget':
            vault.disconnect(user['id'])
            return {'ok':True}
        if kind=='gf_connection_test' and data.get('kind')=='google':
            store.calendar().request()
            grant=vault.read('user:'+str(user['id']))
            grant['checked']=now().isoformat()
            vault.write('user:'+str(user['id']),grant)
            return {'ok':True}
        if kind in ('gf_book','cancel','gf_calendar_save','gf_calendar_cancel'):
            google_accounts.guard_lead_calendar(store,int(data.get('id') or 0))
        if kind in ('gf_calendar_save','gf_calendar_cancel'):
            lid=int(data.get('id') or 0)
            if data.get('sync') is True and not store.credentials.ready('google'): raise ValueError('Conecte sua agenda antes de enviar ao Google.')
            result=service.execute(store,{**data,'action':'gf_book' if kind=='gf_calendar_save' else 'cancel'})
            if data.get('sync') is True:
                result={**result,**store.sync_calendar(lead_id=lid)}
            store.audit(user,kind,lid,{'sync':data.get('sync') is True})
            return result
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

@app.get('/voice-capture.js')
def voice_capture_script():
    script = DIST/'voice-capture.js'
    if not script.is_file():
        return JSONResponse({'error':'Script de captura de voz não compilado.'},404)
    return FileResponse(script,media_type='text/javascript',headers={'Cache-Control':'no-cache'})


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
