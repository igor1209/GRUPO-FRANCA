"""Calendar authorization only: encrypted grants per local user, no Google sign-in."""
import base64
import ctypes
import hashlib
import json
import os
from pathlib import Path
import secrets
import time
import urllib.parse

from cryptography.fernet import Fernet, InvalidToken
from . import connectors

REDIRECT = 'http://127.0.0.1:8780/oauth/google/callback'
SCOPES = {'https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'}


def dpapi(data, decrypt=False):
    from ctypes import wintypes
    class Blob(ctypes.Structure):
        _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_byte))]
    buffer = ctypes.create_string_buffer(data)
    source = Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte)))
    output = Blob()
    crypt32 = ctypes.WinDLL('crypt32', use_last_error=True)
    protect, unprotect = crypt32.CryptProtectData, crypt32.CryptUnprotectData
    protect.argtypes = [ctypes.POINTER(Blob), wintypes.LPCWSTR, ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
    unprotect.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
    protect.restype = unprotect.restype = wintypes.BOOL
    local_free = ctypes.WinDLL('kernel32', use_last_error=True).LocalFree
    local_free.argtypes = [ctypes.c_void_p]
    local_free.restype = ctypes.c_void_p
    if decrypt:
        ok = unprotect(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(output))
    else:
        ok = protect(ctypes.byref(source), 'Grupo Franca Calendar', None, None, None, 1, ctypes.byref(output))
    if not ok:
        raise ValueError('Não foi possível abrir a chave protegida desta conta Windows.')
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        local_free(output.pbData)


class Vault:
    def __init__(self, store):
        self.store, self.db = store, store.db
        self.db.executescript('''
          CREATE TABLE IF NOT EXISTS google_vault (key TEXT PRIMARY KEY, payload BLOB NOT NULL);
          CREATE TABLE IF NOT EXISTS google_states (state TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
            session TEXT NOT NULL, verifier TEXT NOT NULL, expires REAL NOT NULL);
        ''')
        if 'google_user_id' not in {r[1] for r in self.db.execute('PRAGMA table_info(gf_calendar)')}:
            with self.db:
                self.db.execute('ALTER TABLE gf_calendar ADD COLUMN google_user_id INTEGER NOT NULL DEFAULT 0')
                manager = self.db.execute("SELECT id FROM team_users WHERE role='manager'").fetchone()
                if manager:
                    self.db.execute('UPDATE gf_calendar SET google_user_id=?', (manager[0],))
        self.key_path = Path(self.db.execute('PRAGMA database_list').fetchone()[2]).parent / 'private' / 'google.key'

    def cipher(self):
        self.key_path.parent.mkdir(mode=0o700, exist_ok=True)
        try:
            raw = self.key_path.read_bytes()
        except FileNotFoundError:
            # Never replace a missing key when encrypted data already exists.
            if self.db.execute('SELECT 1 FROM google_vault LIMIT 1').fetchone():
                raise ValueError('Chave Google ausente. Restaure a pasta private do backup; não crie uma nova chave.')
            key = Fernet.generate_key()
            raw = b'DP1' + dpapi(key) if os.name == 'nt' else b'FK1' + key
            try:
                fd = os.open(self.key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            except FileExistsError:
                raw = self.key_path.read_bytes()
            else:
                with os.fdopen(fd, 'wb') as file:
                    file.write(raw)
                    file.flush()
                    os.fsync(file.fileno())
        if raw.startswith(b'DP1') and os.name == 'nt':
            key = dpapi(raw[3:], True)
        elif raw.startswith(b'FK1') and os.name != 'nt':
            key = raw[3:]
        else:
            raise ValueError('Chave Google incompatível com este ambiente. Reconecte com suporte do administrador.')
        return Fernet(key)

    def read(self, key):
        row = self.db.execute('SELECT payload FROM google_vault WHERE key=?', (key,)).fetchone()
        if not row:
            return {}
        try:
            return json.loads(self.cipher().decrypt(row[0]))
        except (InvalidToken, ValueError, TypeError):
            raise ValueError('Não foi possível abrir a autorização Google protegida. Confira a chave do servidor.') from None

    def write(self, key, value):
        payload = self.cipher().encrypt(json.dumps(value).encode())
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO google_vault VALUES (?,?)', (key, payload))

    def app(self):
        saved = self.read('app')
        # Legacy manager/environment configuration is an administrative bootstrap only.
        return {k: saved.get(k) or connectors.os.getenv(k, '') for k in ('GF_GOOGLE_CLIENT_ID', 'GF_GOOGLE_CLIENT_SECRET')}

    def configure(self, data):
        old = self.app()
        clean = {k: str(data.get(k) or '').strip() or old[k] for k in old}
        if any(not v or len(v)>4000 or '\r' in v or '\n' in v for v in clean.values()):
            raise ValueError('Informe o Client ID e o segredo do aplicativo.')
        if clean['GF_GOOGLE_CLIENT_ID'] != old['GF_GOOGLE_CLIENT_ID'] and not data.get('GF_GOOGLE_CLIENT_SECRET'):
            raise ValueError('Informe o segredo correspondente ao novo Client ID.')
        if old.get('GF_GOOGLE_CLIENT_ID') and old['GF_GOOGLE_CLIENT_ID'] != clean['GF_GOOGLE_CLIENT_ID'] and self.db.execute("SELECT 1 FROM google_vault WHERE key LIKE 'user:%'").fetchone():
            raise ValueError('Já existem agendas conectadas. Mantenha o Client ID desta instalação.')
        self.write('app', clean)
        with self.db:
            self.db.execute('DELETE FROM google_states')

    def begin(self, user, cookie):
        app = self.app()
        if not all(app.values()):
            raise ValueError('A integração Google ainda não foi preparada pelo administrador.')
        state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(48)
        hashed = hashlib.sha256(cookie.encode()).hexdigest()
        if not self.store.current_user(cookie):
            raise ValueError('Entre novamente na plataforma.')
        with self.db:
            self.db.execute('DELETE FROM google_states WHERE expires<? OR user_id=?', (time.time(),user['id']))
            self.db.execute('INSERT INTO google_states VALUES (?,?,?,?,?)', (hashlib.sha256(state.encode()).hexdigest(),user['id'],hashed,verifier,time.time()+600))
        query = dict(client_id=app['GF_GOOGLE_CLIENT_ID'], redirect_uri=REDIRECT, response_type='code',
                     access_type='offline', prompt='consent select_account', state=state, scope=' '.join(sorted(SCOPES)),
                     code_challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('='), code_challenge_method='S256')
        return 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(query)

    def finish(self, code, state, error=''):
        hashed = hashlib.sha256(state.encode()).hexdigest()
        with self.db:
            record = self.db.execute('SELECT * FROM google_states WHERE state=?', (hashed,)).fetchone()
            self.db.execute('DELETE FROM google_states WHERE state=?', (hashed,))
        if not record or record['expires'] < time.time():
            raise ValueError('Autorização expirada. Conecte a agenda novamente.')
        user = self.db.execute('''SELECT u.* FROM team_users u JOIN team_sessions s ON s.user_id=u.id
          WHERE u.id=? AND s.token=? AND s.expires>? AND u.active=1 AND u.must_change=0''',
          (record['user_id'],record['session'],time.time())).fetchone()
        if not user or (user['role']!='manager' and 'book' not in json.loads(user['permissions'])) or error or not code:
            raise ValueError('Autorização não concluída ou sessão encerrada.')
        app = self.app()
        result = connectors.http_json('https://oauth2.googleapis.com/token','POST', dict(
            client_id=app['GF_GOOGLE_CLIENT_ID'],client_secret=app['GF_GOOGLE_CLIENT_SECRET'],code=code,
            code_verifier=record['verifier'],grant_type='authorization_code',redirect_uri=REDIRECT),form=True)
        if not result.get('refresh_token') or not result.get('access_token') or not SCOPES.issubset(set(result.get('scope','').split())):
            raise ValueError('Autorize as duas permissões de agenda e tente novamente.')
        primary = connectors.http_json('https://www.googleapis.com/calendar/v3/calendars/primary', headers={'Authorization':'Bearer '+result['access_token']})
        calendar = primary.get('id','')
        if not calendar or len(calendar)>1000:
            raise ValueError('O Google não identificou a agenda principal.')
        # primary is an alias, not an account identity. Freeze the actual calendar ID.
        different = self.db.execute("SELECT 1 FROM gf_calendar WHERE google_user_id=? AND calendar_id NOT IN ('','primary',?) AND status NOT IN ('local_test','cancelled_test','remote_cancelled') LIMIT 1", (user['id'],calendar)).fetchone()
        if different:
            raise ValueError('Há reservas vinculadas a outra conta Google. Reconecte a conta original.')
        if user['role']=='manager':
            # Verify legacy synchronized events before replacing the old 'primary' alias.
            legacy = self.db.execute("SELECT event_id FROM gf_calendar WHERE google_user_id=? AND calendar_id='primary' AND status='synced' AND operation='upsert'", (user['id'],)).fetchall()
            installation = self.db.execute("SELECT value FROM gf_system WHERE key='installation'").fetchone()[0]
            for event in legacy:
                remote = connectors.http_json('https://www.googleapis.com/calendar/v3/calendars/'+urllib.parse.quote(calendar,safe='')+'/events/'+event['event_id'], headers={'Authorization':'Bearer '+result['access_token']})
                if remote.get('extendedProperties',{}).get('private',{}).get('gf_installation')!=installation:
                    raise ValueError('Reconecte a conta Google utilizada nas reservas anteriores.')
        self.write('user:'+str(user['id']), {'refresh':result['refresh_token'], 'calendar':calendar, 'checked':''})
        if user['role']=='manager':
            with self.db:
                self.db.execute("UPDATE gf_calendar SET calendar_id=? WHERE google_user_id=? AND calendar_id='primary'", (calendar,user['id']))

    def disconnect(self, uid):
        # Remove only this user's local grant; no meetings, events or other accounts are deleted.
        with self.db:
            self.db.execute('DELETE FROM google_vault WHERE key=?', ('user:'+str(uid),))
            self.db.execute('DELETE FROM google_states WHERE user_id=?', (uid,))


class UserCredentials(connectors.Credentials):
    def __init__(self, vault, uid, legacy):
        super().__init__()
        self.vault, self.uid, self.legacy = vault, uid, legacy
        self.grant = vault.read('user:'+str(uid))
        self.values = {**vault.app(), 'GF_GOOGLE_REFRESH_TOKEN':self.grant.get('refresh',''), 'GF_GOOGLE_CALENDAR_ID':self.grant.get('calendar','primary')}
        if self.grant.get('checked'): self.checked['google']=self.grant['checked']

    def get(self, key, fallback=''):
        if key.startswith('GF_GOOGLE_'): return str(self.values.get(key, fallback)).strip()
        return self.legacy.get(key, fallback)

    def public(self):
        result = self.legacy.public()
        result['values'] = {k:v for k,v in result['values'].items() if not k.startswith('GF_GOOGLE_')}
        result['configured']['google'] = self.ready('google')
        result['checked'] = {k:v for k,v in result['checked'].items() if k!='google'}
        result['checked'].update(self.checked)
        result['google_app_ready'] = all(self.vault.app().values())
        return result


def bind(store, user):
    vault = Vault(store)
    store.google_user_id = user['id']
    store.credentials = UserCredentials(vault,user['id'],store.credentials)
    return vault


def guard_lead_calendar(store, lid):
    if store.db.execute('''SELECT 1 FROM gf_calendar c JOIN meetings m ON m.id=c.meeting_id
       WHERE m.lead_id=? AND m.active=1 AND c.google_user_id<>? AND c.status<>'local_test' ''', (lid,store.google_user_id)).fetchone():
        raise ValueError('A reserva está vinculada à agenda de outro usuário. O responsável original deve cancelá-la antes de uma nova reserva.')
