"""Real SMTP/IMAP and Google Calendar adapters. Credentials never enter SQLite."""
import email
import hashlib
import imaplib
import json
import os
import re
import secrets
import smtplib
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.policy import default
from html.parser import HTMLParser

from .core import TZ, now

ENV_KEYS = ('GF_SMTP_HOST', 'GF_SMTP_PORT', 'GF_MAIL_USER', 'GF_MAIL_PASSWORD',
            'GF_MAIL_FROM', 'GF_IMAP_HOST', 'GF_IMAP_PORT', 'GF_IMAP_FOLDER',
            'GF_MAIL_NEW_SENDERS', 'GF_GOOGLE_CLIENT_ID', 'GF_GOOGLE_CLIENT_SECRET',
            'GF_GOOGLE_REFRESH_TOKEN', 'GF_GOOGLE_CALENDAR_ID')


def email_address(value):
    value = str(value).strip().lower()
    if len(value) > 160 or not re.fullmatch(r'[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+', value):
        raise ValueError('Informe um endereço de e-mail válido.')
    return value


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def http_json(url, method='GET', body=None, headers=None, form=False):
    encoded = None if body is None else (urllib.parse.urlencode(body).encode() if form else json.dumps(body).encode())
    request = urllib.request.Request(url, data=encoded, method=method, headers={
        'Content-Type': 'application/x-www-form-urlencoded' if form else 'application/json', **(headers or {})})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=25) as response:
            raw = response.read(3_000_000)
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raise RemoteError(exc.code) from None
    except (OSError, ValueError):
        raise ValueError('Não foi possível alcançar o Google no prazo. Nenhuma confirmação externa foi registrada.') from None


class RemoteError(ValueError):
    def __init__(self, status):
        self.status = status
        super().__init__(f'Google respondeu HTTP {status}. Confira a autorização e a agenda configurada.')


class Credentials:
    def __init__(self):
        self.values = {}
        self.checked = {}
        self.google_token = ('', 0)
        self.oauth = ('', 0)
        self.automation = {'enabled': False, 'limit': 40, 'calendar': False, 'last_run': '', 'last_error': ''}

    def get(self, key, fallback=''):
        return self.values.get(key, os.getenv(key, fallback)).strip()

    def configure(self, data):
        self.automation['enabled'] = False
        for key in ENV_KEYS:
            if key in data and str(data[key]).strip():
                value = str(data[key]).strip()
                if len(value) > 4000 or '\r' in value or '\n' in value:
                    raise ValueError('Configuração de conexão inválida.')
                self.values[key] = value
        self.checked.clear()
        self.google_token = ('', 0)

    def ready(self, kind):
        keys = {'smtp': ('GF_SMTP_HOST', 'GF_MAIL_USER', 'GF_MAIL_PASSWORD', 'GF_MAIL_FROM'),
                'imap': ('GF_IMAP_HOST', 'GF_MAIL_USER', 'GF_MAIL_PASSWORD'),
                'google': ('GF_GOOGLE_CLIENT_ID', 'GF_GOOGLE_CLIENT_SECRET', 'GF_GOOGLE_REFRESH_TOKEN')}
        return all(self.get(key) for key in keys[kind])

    def configure_google(self, data):
        keys=('GF_GOOGLE_CLIENT_ID','GF_GOOGLE_CLIENT_SECRET','GF_GOOGLE_CALENDAR_ID')
        clean={key:str(data[key]).strip() for key in keys if key in data and str(data[key]).strip()}
        if any(len(value)>4000 or '\r' in value or '\n' in value for value in clean.values()):
            raise ValueError('Confira os dados de autorização Google.')
        if 'GF_GOOGLE_CLIENT_ID' in clean and clean['GF_GOOGLE_CLIENT_ID']!=self.get('GF_GOOGLE_CLIENT_ID') and not clean.get('GF_GOOGLE_CLIENT_SECRET'):
            raise ValueError('Ao trocar o Client ID, informe o Client secret correspondente.')
        changed_client=any(key in clean and clean[key]!=self.get(key) for key in ('GF_GOOGLE_CLIENT_ID','GF_GOOGLE_CLIENT_SECRET'))
        self.values.update(clean)
        if changed_client:self.values['GF_GOOGLE_REFRESH_TOKEN']=''
        self.google_token=('',0)
        self.oauth=('',0)
        self.checked.pop('google',None)

    def forget_google(self):
        for key in ('GF_GOOGLE_CLIENT_ID','GF_GOOGLE_CLIENT_SECRET','GF_GOOGLE_REFRESH_TOKEN','GF_GOOGLE_CALENDAR_ID'):
            self.values[key]=''
        self.google_token=('',0)
        self.oauth=('',0)
        self.checked.pop('google',None)
        self.automation['calendar']=False

    def public(self):
        public_keys = ('GF_SMTP_HOST', 'GF_SMTP_PORT', 'GF_MAIL_USER', 'GF_MAIL_FROM',
                       'GF_IMAP_HOST', 'GF_IMAP_PORT', 'GF_IMAP_FOLDER', 'GF_MAIL_NEW_SENDERS',
                       'GF_GOOGLE_CALENDAR_ID','GF_GOOGLE_CLIENT_ID')
        return {'values': {key: self.get(key) for key in public_keys},
                'configured': {key: self.ready(key) for key in ('smtp', 'imap', 'google')},
                'checked': dict(self.checked), 'automation': dict(self.automation)}

    def forget(self):
        self.values.clear()
        self.checked.clear()
        self.google_token = ('', 0)
        self.oauth = ('', 0)
        self.automation['enabled'] = False

    def authorization_url(self):
        if not self.get('GF_GOOGLE_CLIENT_ID') or not self.get('GF_GOOGLE_CLIENT_SECRET'):
            raise ValueError('Aplique o Client ID e o Client secret do seu projeto Google antes de autorizar.')
        state = secrets.token_urlsafe(32)
        self.oauth = (state, time.time() + 600)
        query = {'client_id': self.get('GF_GOOGLE_CLIENT_ID'), 'redirect_uri': 'http://127.0.0.1:8780/oauth/google/callback',
                 'response_type': 'code', 'access_type': 'offline', 'prompt': 'consent', 'state': state,
                 'scope': 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'}
        return 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(query)

    def finish_authorization(self, code, state):
        expected, expiry = self.oauth
        self.oauth = ('', 0)
        if not expected or expiry < time.time() or not secrets.compare_digest(expected, state):
            raise ValueError('Autorização expirada ou inválida. Inicie a conexão novamente pela plataforma.')
        result = http_json('https://oauth2.googleapis.com/token', 'POST', {
            'client_id': self.get('GF_GOOGLE_CLIENT_ID'), 'client_secret': self.get('GF_GOOGLE_CLIENT_SECRET'),
            'code': code, 'grant_type': 'authorization_code', 'redirect_uri': 'http://127.0.0.1:8780/oauth/google/callback'}, form=True)
        if not result.get('refresh_token'):
            raise ValueError('O Google não forneceu uma autorização persistente. Tente autorizar novamente.')
        self.values['GF_GOOGLE_REFRESH_TOKEN'] = result['refresh_token']
        self.google_token = ('', 0)
        self.checked.pop('google',None)


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1
        if tag in ('p', 'div', 'br', 'li'):
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def mail_body(message):
    part = message.get_body(preferencelist=('plain', 'html'))
    if not part:
        return ''
    text = part.get_content()
    if not isinstance(text, str):
        return ''
    if part.get_content_type() == 'text/html':
        parser = TextExtractor()
        parser.feed(text)
        text = ''.join(parser.parts)
    # Ignore quoted history when matching opt-out or generating a new turn.
    text = re.split(r'(?im)^\s*(?:On .+wrote:|Em .+escreveu:|[-]+\s*Original Message\s*[-]+|>).*$', text)[0]
    return text.strip()[:16000]


class Mail:
    def __init__(self, credentials):
        self.c = credentials

    def smtp(self):
        if not self.c.ready('smtp'):
            raise ValueError('Configure o SMTP antes de enviar.')
        host = self.c.get('GF_SMTP_HOST')
        port = int(self.c.get('GF_SMTP_PORT', '465'))
        if not re.fullmatch(r'[a-zA-Z0-9.-]+', host) or port not in (465, 587):
            raise ValueError('Use um host SMTP válido e porta 465 (SSL) ou 587 (STARTTLS).')
        connection = smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context()) if port == 465 else smtplib.SMTP(host, port, timeout=20)
        try:
            if port == 587:
                connection.ehlo()
                connection.starttls(context=ssl.create_default_context())
                connection.ehlo()
            connection.login(self.c.get('GF_MAIL_USER'), self.c.get('GF_MAIL_PASSWORD'))
            return connection
        except Exception:
            connection.close()
            raise ValueError('Falha na autenticação SMTP. Confira servidor, usuário e senha de aplicativo.') from None

    def imap(self):
        if not self.c.ready('imap'):
            raise ValueError('Configure o IMAP antes de receber.')
        host = self.c.get('GF_IMAP_HOST')
        if not re.fullmatch(r'[a-zA-Z0-9.-]+', host):
            raise ValueError('Host IMAP inválido.')
        connection = imaplib.IMAP4_SSL(host, int(self.c.get('GF_IMAP_PORT', '993')), ssl_context=ssl.create_default_context(), timeout=20)
        try:
            connection.login(self.c.get('GF_MAIL_USER'), self.c.get('GF_MAIL_PASSWORD'))
            status, _ = connection.select(self.c.get('GF_IMAP_FOLDER', 'INBOX'), readonly=True)
            if status != 'OK':
                raise ValueError()
            return connection
        except Exception:
            try:
                connection.logout()
            except Exception:
                pass
            raise ValueError('Falha na autenticação IMAP ou na abertura da pasta.') from None

    def account(self):
        raw = '|'.join(self.c.get(key) for key in ('GF_IMAP_HOST', 'GF_MAIL_USER', 'GF_IMAP_FOLDER'))
        return hashlib.sha256(raw.encode()).hexdigest()

    def send(self, row):
        message = EmailMessage()
        message['From'] = email_address(self.c.get('GF_MAIL_FROM'))
        message['To'] = email_address(row['recipient'])
        message['Subject'] = row['subject']
        message['Message-ID'] = row['external_id']
        if row['reply_to']:
            message['In-Reply-To'] = row['reply_to']
            message['References'] = row['reply_to']
        message['Auto-Submitted'] = 'auto-generated' if row['mode'] == 'ai' else 'no'
        message.set_content(row['body'])
        connection = None
        started = False
        accepted = False
        try:
            connection = self.smtp()
            started = True
            refused = connection.send_message(message)
            if refused:
                return 'failed', 'O servidor recusou o destinatário.'
            accepted = True
            return 'sent', ''
        except (smtplib.SMTPRecipientsRefused, smtplib.SMTPSenderRefused, smtplib.SMTPDataError):
            return 'failed', 'O servidor SMTP recusou o envio. Confira destinatário e remetente.'
        except Exception:
            if accepted:
                return 'sent', ''
            return ('unknown', 'Conexão interrompida durante o envio. Confira a caixa Enviados antes de reconciliar; não reenviamos automaticamente.') if started else ('failed', 'Não foi possível conectar ou autenticar no SMTP.')
        finally:
            if connection:
                connection.close()


class GoogleCalendar:
    def __init__(self, credentials):
        self.c = credentials

    def token(self):
        if not self.c.ready('google'):
            raise ValueError('Autorize o Google Calendar antes de sincronizar.')
        token, expiry = self.c.google_token
        if expiry > time.time() + 60:
            return token
        result = http_json('https://oauth2.googleapis.com/token', 'POST', {
            'client_id': self.c.get('GF_GOOGLE_CLIENT_ID'),
            'client_secret': self.c.get('GF_GOOGLE_CLIENT_SECRET'),
            'refresh_token': self.c.get('GF_GOOGLE_REFRESH_TOKEN'),
            'grant_type': 'refresh_token'}, form=True)
        if not result.get('access_token'):
            raise ValueError('O Google não retornou um token de acesso.')
        self.c.google_token = (result['access_token'], time.time() + int(result.get('expires_in', 3600)))
        return result['access_token']

    def request(self, suffix='', method='GET', data=None):
        calendar = urllib.parse.quote(self.c.get('GF_GOOGLE_CALENDAR_ID', 'primary'), safe='')
        return http_json('https://www.googleapis.com/calendar/v3/calendars/' + calendar + suffix,
                         method, data, {'Authorization': 'Bearer ' + self.token()})

    def busy(self, start, end, ignore=''):
        blocks, page = [], ''
        for _ in range(20):
            query = {'singleEvents': 'true', 'timeMin': start.replace(tzinfo=TZ).isoformat(),
                     'timeMax': end.replace(tzinfo=TZ).isoformat(), 'maxResults': 2500}
            if page:
                query['pageToken'] = page
            result = self.request('/events?' + urllib.parse.urlencode(query))
            for event in result.get('items', []):
                if event.get('id') == ignore or event.get('status') == 'cancelled' or event.get('transparency') == 'transparent':
                    continue
                def local(value):
                    value = value.get('dateTime', value.get('date', ''))
                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    return dt.astimezone(TZ).replace(tzinfo=None) if dt.tzinfo else dt
                blocks.append((local(event['start']), local(event['end'])))
            page = result.get('nextPageToken', '')
            if not page:
                return blocks
        raise ValueError('Agenda externa muito extensa; reduza o período ou use uma agenda comercial dedicada.')

    def sync(self, row, lead, installation):
        suffix = '/events/' + row['event_id']
        if row['operation'] == 'cancel':
            try:
                self.request(suffix + '?sendUpdates=all', 'DELETE')
            except RemoteError as exc:
                if exc.status not in (404, 410):
                    raise
            return {}
        payload = {'id': row['event_id'], 'summary': 'Grupo França · ' + (lead['company'] or lead['name']),
                   'description': 'Conversa comercial com o Grupo França. Referência local: ' + str(row['meeting_id']),
                   'start': {'dateTime': row['start'] + '-03:00', 'timeZone': 'America/Sao_Paulo'},
                   'end': {'dateTime': row['end'] + '-03:00', 'timeZone': 'America/Sao_Paulo'},
                   'extendedProperties': {'private': {'gf_installation': installation, 'gf_meeting_id': str(row['meeting_id']), 'gf_lead_id': str(lead['id'])}},
                   'attendees': [{'email': row['attendee']}] if row['attendee'] else []}
        try:
            existing = self.request(suffix)
        except RemoteError as exc:
            if exc.status != 404:
                raise
            try:
                return self.request('/events?sendUpdates=all', 'POST', payload)
            except RemoteError as collision:
                if collision.status != 409:
                    raise
                existing = self.request(suffix)
        if existing.get('extendedProperties', {}).get('private', {}).get('gf_installation') != installation:
            raise ValueError('O evento externo não pertence a esta instalação. Sincronização interrompida.')
        if existing.get('status') == 'cancelled':
            raise ValueError('Este evento foi cancelado no Google. Reconcilie a agenda antes de tentar novamente.')
        payload.pop('id')
        return self.request(suffix + '?sendUpdates=all', 'PATCH', payload)
