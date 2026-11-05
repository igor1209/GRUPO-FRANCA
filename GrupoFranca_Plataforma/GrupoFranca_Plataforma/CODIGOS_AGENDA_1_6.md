# Grupo França · Vendedores e agenda · 1.6

Esta entrega dá continuidade aos passos restantes: validação dos vendedores, agenda integrada e, depois, SDR de IA de voz. A migração ao PostgreSQL e a hospedagem continuam como uma etapa separada. A versão atual ainda utiliza SQLite.

## Aplicar a atualização

Coloque ATUALIZAR_AGENDA_1_6.ps1 em C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR, na mesma pasta do atualizador anterior. Feche a plataforma com Ctrl+C e execute:

```powershell
cd "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ATUALIZAR_AGENDA_1_6.ps1" -PastaProjeto "C:\Users\igorl\OneDrive\Desktop\GrupoFrancaSDR\GrupoFranca_Plataforma"
if ($LASTEXITCODE -eq 0) { .\GrupoFranca_Plataforma\iniciar.bat }
```

O pacote contém a interface compilada. Não é necessário executar npm, extrair pastas ou reinstalar o WhatsApp. Contas, contatos, configurações salvas e sessões de WhatsApp não são substituídos. O código anterior é guardado em backup_atualizacoes. O atualizador tenta restaurar os arquivos anteriores se a cópia falhar. A leitura dos arquivos embarcados e seus hashes foi verificada aqui; o script PowerShell não foi executado no seu Windows.

## 1. Validar o acesso do vendedor

Os testes automatizados verificam criação de contas, mudança de senha inicial, permissões, isolamento das carteiras, importação e distribuição. Esta entrega amplia os testes para reservas e cancelamentos: o vendedor não pode agendar ou cancelar para leads de outro vendedor e precisa da permissão Agendar reuniões. Somente o gerente configura e sincroniza o Google.

Para conferir sua instalação:

1. Como gerente, abra Equipe → Usuários e crie uma conta de vendedor com senha temporária.
2. Em Equipe → Distribuição, atribua um contato interno de teste a essa conta. Não registre uma venda fictícia como Ganho.
3. Abra uma janela privativa, acesse http://127.0.0.1:8780 e entre com a conta do vendedor. Defina a nova senha quando solicitado.
4. Confira que o contato atribuído aparece e que usuários e configurações do gerente não ficam disponíveis.
5. Volte ao gerente, transfira o contato para outro responsável e atualize os dados do vendedor. O contato deve sair da carteira dele.
6. Para testar a agenda, atribua o contato ao vendedor novamente e confira a permissão Agendar reuniões. Reagendamento e cancelamento ficam desabilitados quando essa permissão não estiver presente; o backend também bloqueia solicitações diretas.

Incluímos um verificador somente de leitura. Ele não acessa serviços externos nem exibe nomes, telefones ou senhas. Na pasta principal do projeto, execute:

```powershell
.\.venv\Scripts\python.exe .\verificar_plataforma.py
```

Ele confere a integridade do SQLite, referências entre registros, gerente ativo, vendedores cadastrados, atribuições de carteira, permissões, etapas do funil e sobreposição de reservas. Avisos de ausência de vendedores ou carteira vinculada a usuário inativo são informativos. Falhas de integridade, atribuição ou conflito de reservas precisam ser corrigidas. Esse teste interno não substitui o teste de login e uso pelos funcionários.

## 2. Conectar o Google Calendar

A Agenda agora oferece ao gerente um painel próprio de configuração do Google, sem abrir a antiga tela de e-mail. O estado indica Não autorizado, Autorizado · teste o acesso ou Acesso testado.

A conexão depende de um projeto Google com a Calendar API ativada e credenciais OAuth. O gerente informa esses dados diretamente na plataforma, sem enviá-los pelo chat:

1. No Google Cloud, crie ou selecione o projeto e ative a Google Calendar API.
2. Configure a tela de consentimento. Para uso externo à organização em modo de teste, inclua a conta autorizadora na lista de usuários de teste. Regras de publicação e validação podem variar conforme o tipo de conta e o uso.
3. Crie um cliente OAuth do tipo Aplicativo da Web.
4. Cadastre exatamente o URI de redirecionamento autorizado:

```text
http://127.0.0.1:8780/oauth/google/callback
```

5. Entre como gerente no app e abra Agenda → Google Calendar → Configurar conexão Google.
6. Informe Client ID e Client secret. Para a agenda principal, mantenha primary no campo ID da agenda. Uma agenda comercial dedicada também pode ser utilizada, com seu ID e acesso concedido à conta autorizadora.
7. Clique em Salvar e preparar autorização e depois em Autorizar minha agenda Google.
8. Conclua a autorização na página do Google, volte ao app e atualize os dados.
9. Clique em Testar acesso à agenda.

As credenciais preenchidas por essa tela ficam na memória desta sessão do servidor; precisam ser informadas e autorizadas novamente após reiniciar. O backend também aceita GF_GOOGLE_CLIENT_ID, GF_GOOGLE_CLIENT_SECRET, GF_GOOGLE_REFRESH_TOKEN e GF_GOOGLE_CALENDAR_ID por variáveis de ambiente. O armazenamento persistente de segredos no servidor será definido na etapa de hospedagem. O app não grava esses segredos no SQLite nem os devolve aos vendedores.

Trocar o cliente exige o Client secret correspondente e invalida a autorização antiga em memória. Limpar dados desta sessão remove apenas os dados Google, preservando os outros canais e as reservas. Essa ação não revoga a permissão na conta Google nem apaga eventos já criados. A autorização também pode ser revogada nas configurações da própria conta Google.

## Reservar, reagendar e cancelar

As reuniões têm 30 minutos, em dias e horários permitidos pela configuração do agente, no fuso de Brasília. Os campos estão bloqueados para quem não possui a permissão de agendamento.

- Reservar: selecione o contato, consulte horários ou informe data e hora, revise e confirme a reserva local.
- Com Google autorizado: o backend consulta conflitos externos e locais antes de reservar. Se a consulta externa falhar, a reserva não é confirmada como se estivesse livre.
- Sem Google autorizado: a tela indica Agenda interna e verifica apenas os conflitos locais. Não há confirmação ou convite externo.
- Sincronizar: o gerente usa Sincronizar e enviar convites para aplicar as operações pendentes no Google. Um e-mail de convidado é opcional. Esse botão pode enviar convites ou cancelamentos reais para os e-mails cadastrados, por isso confira as reservas antes de executar.
- Reagendar: use o botão da reserva, selecione o novo horário, revise e confirme. A sincronização aplica o cancelamento do evento anterior e a nova reserva.
- Cancelar: confirme o cancelamento no app e sincronize para atualizar o Google e os convidados.
- Alteração no Google: o gerente usa Ler alterações do Google para reconciliar horários e cancelamentos. Alterações incompatíveis são informadas como erro para revisão.

O teste de acesso verifica a leitura da agenda. A permissão de escrita e a criação real do evento precisam ser confirmadas no primeiro agendamento de teste. O app não declara um evento sincronizado antes da confirmação da API; um convite aceito pelo Google não comprova leitura pelo convidado.

Novos convites pendentes não são enviados para um contato bloqueado. Uma reserva de teste do simulador não é sincronizada como evento real. Mover um card para Reunião no funil não cria compromisso na agenda.

## O que está validado e o que depende da sua conta

Passaram 115 testes do backend, executados em lotes, e 29 testes da interface. Também passou o build de produção. As verificações abrangem o controle de acesso dos vendedores, isolamento das credenciais Google, autorização de uso único, reservas e cancelamentos por carteira, bloqueio de convites para contatos bloqueados e leitura do verificador sem alteração do banco.

Não foi conectada uma conta Google real neste ambiente. A autorização, o primeiro evento e a confirmação de cancelamento/reagendamento com sua conta ainda precisam ser validados na sua instalação. A conexão e os envios de WhatsApp de texto foram validados anteriormente por você.

## 3. Próxima etapa: SDR de IA de voz

O roteiro e as regras combinadas estão em PLANO_SDR_VOZ.md. A telefonia e o motor de voz ainda não foram implementados ou conectados. Para continuar, precisamos definir se você já possui uma operadora/provedor com API ou SIP ou se começaremos essa parte do zero.


# Roteiro e regras da próxima etapa de voz

# Grupo França · Próxima etapa: SDR de IA de voz

Este documento define o comportamento combinado. O motor de voz e a telefonia ainda não estão implementados ou conectados; não há ligações reais nesta entrega.

## Fluxo comercial

O vendedor cadastra ou importa os leads da sua carteira e seleciona quais entram na discagem. A IA liga com o roteiro padrão do Grupo França, identifica a necessidade e propõe uma conversa comercial quando houver interesse e adequação.

A conversa deve começar com uma apresentação clara do assistente virtual do Grupo França e uma pergunta sobre a disponibilidade para falar. Se a pessoa pedir retorno, o assistente registra a data e o horário combinados, no fuso de Brasília. Se pedir para não receber contato, registra o bloqueio e interrompe novas abordagens.

Durante a conversa, o assistente busca entender o desafio de aquisição de clientes, como a empresa atende esse desafio hoje, o papel da pessoa na decisão e o prazo para avaliar uma solução. As perguntas devem acompanhar o contexto, uma de cada vez, sem transformar a conversa em um questionário rígido.

## Resultado e próxima ação

| Resultado | Ação prevista |
| --- | --- |
| Não atendeu | Reprogramar tentativa em outro horário, dentro dos limites definidos. |
| Ocupado | Reprogramar após o intervalo configurado. |
| Pediu retorno | Usar o dia e horário combinados. |
| Número inválido | Suspender a discagem e encaminhar para correção pelo vendedor. |
| Interesse e necessidade compatíveis | Registrar evidências e sugerir qualificação ao vendedor. |
| Caso indefinido | Encaminhar para revisão humana. |
| Não contatar | Bloquear novas abordagens. |

O resultado técnico da chamada precisa vir da operadora/provedor. A ausência de resposta não pode ser inferida de uma transcrição vazia. Em caso de resultado incerto de uma solicitação de chamada, é necessário consultar o provedor antes de repetir, para evitar discagem duplicada.

A qualificação comercial segue critérios definidos pelo Grupo França. Uma autorização para enviar informações por WhatsApp não representa, sozinha, um lead qualificado. O resumo deve registrar necessidade, contexto, interesse, papel na decisão, prazo, próxima ação e pontos que ficaram sem confirmação.

## Funil e controle do vendedor

Na primeira versão de voz, o assistente sugere a classificação e o vendedor confirma a movimentação no funil. Após validarmos as avaliações, mudanças com critérios claros poderão ser automatizadas. Ganho dependerá da confirmação do vendedor.

O vendedor acompanha, pausa e cancela a fila da própria carteira. A reatribuição de um lead exige reavaliar a fila, para evitar uma chamada pelo vendedor anterior. Limites de tentativas e horários serão controlados pelo gerente. Uma resposta, cancelamento ou bloqueio deve invalidar tentativas que deixaram de fazer sentido.

O WhatsApp permanece como apoio ao contato. A agenda continua sendo a fonte para disponibilidade e registro de reservas. O assistente não deve prometer horários sem consulta e confirmação.

## Recurso que precisamos definir antes das ligações

Precisamos de uma operadora ou provedor que permita fazer e acompanhar chamadas por API ou SIP, com número de origem autorizado. Também precisaremos integrar os componentes que reconhecem a fala, conduzem a conversa e produzem a voz.

Ainda não foram escolhidos ou contratados esses serviços. Credenciais não devem ser enviadas pelo chat. Custos, cobertura, números e limites precisam ser verificados na escolha da telefonia. O teste inicial de chamada será para um número controlado e após uma ação explícita do operador, antes de liberar listas comerciais.


# Código completo dos arquivos alterados

O atualizador também inclui a interface compilada. Se copiar os códigos manualmente, execute reconstruir_interface.bat antes de iniciar.

## backend/connectors.py

```python
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
                   'extendedProperties': {'private': {'gf_installation': installation}},
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
                if row['operation']!='cancel' and self.lead(row['lead_id'])['blocked']:
                    raise ValueError('Contato bloqueado. Nenhum novo convite será enviado.')
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
        if action == 'gf_google_config':
            store.credentials.configure_google(data)
            return {'ok':True}
        if action == 'gf_google_forget':
            store.credentials.forget_google()
            return {'ok':True}
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
        commercial.update(examples=[],knowledge=[],model=None,connections={'values':{},'configured':{'google':store.credentials.ready('google')},'checked':{}})
    return {'user':user,'leads':[l for l in store.leads() if l['id'] in ids], 'meetings':meetings,
            'workspace':workspace,'commercial':commercial,'team':store.team_state(user)}
```

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

app = FastAPI(title='Grupo França Comercial', version='1.6.0', lifespan=lifespan,
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
        return {'token':TOKEN, 'version':'1.6.0',
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

## frontend/src/App.tsx

```tsx
import {useCallback,useEffect,useState} from 'react';
import {ChartNoAxesColumnIncreasing,ChartNoAxesCombined,LayoutGrid,Users,MessageSquare,CalendarDays,History,Bot,BarChart3,ChevronDown,Menu,LogOut,KeyRound,RefreshCw,AlertCircle,CheckCircle2} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {Brand} from './Brand';
import {Access} from './Access';
import {api,connect} from './api';
import {Avatar,Button,Loading,Modal} from './components';
import {can,type State,type Lead,type Page,type Action,type Session} from './types';
import {Overview,SalesPipeline,Management} from './Workplace';
import {Contacts,ContactForm,Growth,Agenda} from './Platform';
import {Cadences} from './Operations';
import {WhatsAppPage,CallsHistory,CadenceHistory,Returns,ContactNotes,AgentSettings,whatsappLink} from './Sections';
import './navigation.css';

type Screen=Page|'whatsapp'|'history_calls'|'history_cadences'|'returns';
const menu:readonly [Screen,string,LucideIcon][]=[
  ['dashboard','Visão geral',ChartNoAxesColumnIncreasing],
  ['growth','Análise comercial',ChartNoAxesCombined],
  ['pipeline','Funil comercial',LayoutGrid],
  ['contacts','Contatos',Users],
  ['whatsapp','WhatsApp',MessageSquare],
  ['agenda','Agenda',CalendarDays],
];
const titles:Partial<Record<Screen,string>>={history_calls:'Ligações individuais',history_cadences:'Histórico de cadências',returns:'Retornos',settings:'Assistente',cadences:'Fluxo de cadência',blocked:'Blacklist',team:'Equipe'};
export default function App(){
  const [session,setSession]=useState<Session|null>(null),[state,setState]=useState<State|null>(null);
  const [page,setPage]=useState<Screen>('dashboard'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [sidebar,setSidebar]=useState(false),[historyOpen,setHistoryOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false);
  const [selected,setSelected]=useState<number|null>(null),[form,setForm]=useState<'new'|'edit'|null>(null),[editing,setEditing]=useState<Lead|null>(null);
  const [password,setPassword]=useState(false),[passwordError,setPasswordError]=useState('');
  const [toast,setToast]=useState<{text:string;error:boolean}|null>(null);
  const [confirmation,setConfirmation]=useState<{text:string;data:Record<string,unknown>}|null>(null);
  const notify=useCallback((text:string,error=false)=>setToast({text,error}),[]);
  const load=useCallback(async()=>{setState(await api<State>('/api/state'));setError('');},[]);
  useEffect(()=>{
    document.documentElement.dataset.theme='dark';
    connect().then(async s=>{setSession(s);if(s.user&&!s.user.must_change){
      if(s.user.role==='manager')await api('/api/action',{action:'gf_automation',enabled:false});
      await load();
    }}).catch(e=>setError(e.message));
    const expired=()=>{setState(null);setSelected(null);setForm(null);setConfirmation(null);setPassword(false);connect().then(setSession).catch(e=>setError(e.message));};
    window.addEventListener('gf-session-expired',expired);
    return()=>window.removeEventListener('gf-session-expired',expired);
  },[load]);
  useEffect(()=>{if(!state?.user)return;const timer=setInterval(()=>{if(!busy)void load().catch(()=>{});},15000);return()=>clearInterval(timer);},[Boolean(state?.user),busy,load]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),5000);return()=>clearTimeout(timer);},[toast]);
  const act:Action=async data=>{
    setBusy(true);
    try{const result=await api<Record<string,unknown>>('/api/action',data);await load();return result;}
    catch(e){notify(e instanceof Error?e.message:'Não foi possível concluir.',true);return null;}
    finally{setBusy(false);}
  };
  const ready=(s:Session)=>{setSession(s);if(s.user&&!s.user.must_change)void load().catch(e=>setError(e.message));};
  if(session&&(!session.user||session.user.must_change))return <Access session={session} onReady={ready}/>;
  if(!state)return <div className="startup"><Brand className="startup-logo"/>{error?<><p role="alert">{error}</p><Button onClick={()=>location.reload()}>Tentar novamente</Button></>:<Loading/>}</div>;
  const manager=state.user?.role==='manager';
  const lead=state.leads.find(l=>l.id===selected);
  function navigate(next:Screen){
    if(!manager&&['settings','team','cadences','blocked'].includes(next))return;
    setPage(next);setSidebar(false);setSelected(null);
    if(['history_calls','history_cadences','returns'].includes(next))setHistoryOpen(true);
    if(['settings','cadences','blocked'].includes(next))setSettingsOpen(true);
  }
  const legacyNavigate=(next:Page)=>navigate(next==='inbox'?'whatsapp':next==='history'?'history_calls':next);
  const open=(id:number)=>setSelected(id);
  const newContact=()=>{if(can(state,'create')){setEditing(null);setForm('new');}else notify('Cadastro não autorizado para este perfil.',true);};
  const edit=(l:Lead)=>{if(can(state,'edit')){setSelected(null);setEditing(l);setForm('edit');}else notify('Edição não autorizada para este perfil.',true);};
  const confirm=(text:string,data:Record<string,unknown>)=>setConfirmation({text,data});
  const activeHistory=['history_calls','history_cadences','returns'].includes(page);
  const activeSettings=['settings','cadences','blocked'].includes(page);
  const title=menu.find(([key])=>key===page)?.[1]||titles[page]||'Grupo França';
  return <div className="app-shell">
    {sidebar&&<button className="sidebar-scrim" aria-label="Fechar menu" onClick={()=>setSidebar(false)}/>}
    <aside className={'sidebar '+(sidebar?'mobile-open':'')}>
      <div className="brand"><Brand className="sidebar-logo"/></div>
      <nav aria-label="Menu principal">
        {menu.map(([key,label,Icon])=><button key={key} disabled={busy} className={page===key?'active':''} onClick={()=>navigate(key)}><Icon size={18} strokeWidth={1.65}/><span>{label}</span></button>)}
        <div className="nav-group"><button className={activeHistory?'group-selected':''} aria-expanded={historyOpen} aria-controls="history-menu" onClick={()=>setHistoryOpen(v=>!v)}><History size={18}/><span>Histórico</span><ChevronDown size={14} className={historyOpen?'chevron-open':''}/></button>
          {historyOpen&&<div className="nav-submenu" id="history-menu">{([['history_calls','Ligações individuais'],['history_cadences','Cadências'],['returns','Retornos']] as const).map(([key,label])=><button key={key} disabled={busy} className={page===key?'active':''} onClick={()=>navigate(key)}>{label}</button>)}</div>}
        </div>
        {manager&&<div className="nav-group"><button className={activeSettings?'group-selected':''} aria-expanded={settingsOpen} aria-controls="settings-menu" onClick={()=>setSettingsOpen(v=>!v)}><Bot size={18}/><span>Configuração</span><ChevronDown size={14} className={settingsOpen?'chevron-open':''}/></button>
          {settingsOpen&&<div className="nav-submenu" id="settings-menu">{([['settings','Assistente'],['cadences','Fluxo de Cadência'],['blocked','Blacklist']] as const).map(([key,label])=><button key={key} disabled={busy} className={page===key?'active':''} onClick={()=>navigate(key)}>{label}</button>)}</div>}
        </div>}
        {manager&&<button disabled={busy} className={page==='team'?'active':''} onClick={()=>navigate('team')}><BarChart3 size={18}/><span>Equipe</span></button>}
      </nav>
      <div className="sidebar-footer"><div className="account"><Avatar name={state.user?.name||'Igor França'}/><div><b>{state.user?.name}</b><small>{manager?'Gerente':'Vendedor'}</small></div>
        <Button variant="icon" title="Alterar senha" onClick={()=>{setPasswordError('');setPassword(true);}}><KeyRound size={16}/></Button>
        <Button variant="icon" title="Sair" disabled={busy} onClick={async()=>{try{await api('/api/auth/logout',{});setState(null);setSelected(null);setSession(await connect());}catch(e){notify(e instanceof Error?e.message:'Falha ao sair.',true);}}}><LogOut size={16}/></Button>
      </div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><Button variant="icon menu-toggle" title="Abrir menu" onClick={()=>setSidebar(true)}><Menu size={20}/></Button><b>{title}</b></div><Button variant="icon" title="Atualizar dados" disabled={busy} onClick={()=>void load().catch(e=>notify(e.message,true))}><RefreshCw size={16}/></Button></header>
      <main key={page}>
        {page==='dashboard'&&<Overview state={state} open={open} navigate={legacyNavigate} newContact={newContact}/>}
        {page==='growth'&&<Growth state={state} act={act} busy={busy}/>}
        {page==='pipeline'&&<SalesPipeline state={state} act={act} busy={busy} open={open} newContact={newContact}/>}
        {(page==='contacts'||(page==='blocked'&&manager))&&<Contacts state={state} act={act} busy={busy} open={open} edit={edit} newContact={newContact} blocked={page==='blocked'} notify={notify}/>}
        {page==='whatsapp'&&<WhatsAppPage state={state}/>}
        {page==='agenda'&&<Agenda state={state} act={act} busy={busy} open={open} confirm={confirm} notify={notify}/>}
        {page==='history_calls'&&<CallsHistory/>}
        {page==='history_cadences'&&<CadenceHistory state={state} open={open}/>}
        {page==='returns'&&<Returns state={state} open={open}/>}
        {page==='settings'&&manager&&<AgentSettings state={state} act={act} busy={busy}/>}
        {page==='cadences'&&manager&&<Cadences state={state} act={act} busy={busy} open={open} confirm={confirm}/>}
        {page==='team'&&manager&&<Management state={state} act={act} busy={busy}/>}
      </main>
    </div>
    {lead&&<Modal title={lead.name||lead.company} close={()=>setSelected(null)} busy={busy}><p>{lead.company} · {lead.contact}</p><p>{lead.need||'Sem necessidade registrada.'}</p><div className="gf-actions">{!lead.blocked&&whatsappLink(lead.contact)&&<a className="btn primary" href={whatsappLink(lead.contact)} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>}{can(state,'edit')&&<Button onClick={()=>edit(lead)}>Editar cadastro</Button>}</div>{lead.blocked&&<p>Contato em Não contatar.</p>}{can(state,'edit')?<ContactNotes key={lead.id} lead={lead} act={act} busy={busy}/>:<p>{lead.notes||'Sem notas.'}</p>}</Modal>}
    {form&&<ContactForm state={state} lead={form==='edit'?editing:null} busy={busy} act={act} close={()=>setForm(null)} created={id=>{setForm(null);setSelected(id);}}/>}
    {confirmation&&<Modal title="Confirmar ação" description={confirmation.text} busy={busy} close={()=>setConfirmation(null)}><div className="modal-actions"><Button disabled={busy} onClick={()=>setConfirmation(null)}>Voltar</Button><Button variant="primary" disabled={busy} onClick={async()=>{if(await act(confirmation.data))setConfirmation(null);}}>Confirmar</Button></div></Modal>}
    {password&&<Modal title="Alterar senha" busy={busy} close={()=>setPassword(false)}><form onSubmit={async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));if(values.password!==values.confirm){setPasswordError('As senhas precisam ser iguais.');return;}setBusy(true);try{await api('/api/auth/password',values);setPassword(false);notify('Senha alterada.');}catch(e){setPasswordError(e instanceof Error?e.message:'Falha ao alterar senha.');}finally{setBusy(false);}}}>{[['current_password','Senha atual'],['password','Nova senha'],['confirm','Confirmar nova senha']].map(([name,label])=><label key={name}>{label}<input name={name} type="password" required minLength={name==='current_password'?1:10} maxLength={128} autoComplete={name==='current_password'?'current-password':'new-password'}/></label>)}{passwordError&&<p role="alert">{passwordError}</p>}<div className="modal-actions"><Button type="submit" disabled={busy} variant="primary">Salvar senha</Button></div></form></Modal>}
    {toast&&<div className={'toast '+(toast.error?'error':'')} role="status">{toast.error?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}<span>{toast.text}</span><button onClick={()=>setToast(null)}>×</button></div>}
  </div>;
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
import {CalendarConnection} from './CalendarConnection';
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
      {state.user?.role==='manager'&&<CalendarConnection state={state} act={act} busy={busy} notify={notify}/>}
      <section className="card gf-pad">
        <div className="work-title"><h2>Reservar ou reagendar</h2><span className="status neutral">{data.connections.configured.google?'Google autorizado':'Agenda interna'}</span></div>
        {!data.connections.configured.google&&<p>O Google ainda não foi autorizado. As reservas ficam na plataforma e os conflitos externos não podem ser consultados.</p>}
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
                disabled={busy||!can(state,'book')}
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
                disabled={busy||!can(state,'book')}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label className="full">
              E-mail para o convite Google (opcional)
              <input
                type="email"
                value={attendee}
                disabled={busy||!can(state,'book')}
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
              <Button disabled={busy||!can(state,'book')} key={value} onClick={() => setStart(value.slice(0, 16))}>
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
                  disabled={busy||!can(state,'book')}
                  onClick={() => {
                    setSelected(String(meeting.lead_id));
                    setStart(meeting.start.slice(0, 16));
                    setAttendee(link?.attendee || "");
                  }}
                >
                  Reagendar
                </Button>
                <Button
                  disabled={busy||!can(state,'book')}
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
              disabled={busy||!can(state,'book')||!state.leads.some(lead=>lead.id===Number(selected)&&!lead.blocked)}
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

## frontend/src/CalendarConnection.tsx

```tsx
import {useEffect,useState,type FormEvent} from 'react';
import {Button} from './components';
import {date} from './api';
import type {Action,State} from './types';
type Connection={values:Record<string,string>;configured:Record<string,boolean>;checked:Record<string,string>};
export function CalendarConnection({state,act,busy,notify}:{state:State;act:Action;busy:boolean;notify?:(text:string,error?:boolean)=>void}){
 const connection=(state as State&{commercial?:{connections:Connection}}).commercial?.connections;
 const [client,setClient]=useState(connection?.values.GF_GOOGLE_CLIENT_ID||''),[secret,setSecret]=useState(''),[calendar,setCalendar]=useState(connection?.values.GF_GOOGLE_CALENDAR_ID||'primary'),[url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(!url)return;const timer=setTimeout(()=>setUrl(''),600000);return()=>clearTimeout(timer)},[url]);
 if(state.user?.role!=='manager')return null;
 async function authorize(e:FormEvent){
  e.preventDefault();setError('');setUrl('');
  const saved=await act({action:'gf_google_config',GF_GOOGLE_CLIENT_ID:client,GF_GOOGLE_CLIENT_SECRET:secret,GF_GOOGLE_CALENDAR_ID:calendar||'primary'});
  if(!saved){setError('Não foi possível aplicar os dados. Confira a mensagem da plataforma.');return}
  setSecret('');
  const result=await act({action:'gf_google_authorize'});
  const value=String(result?.url||'');
  if(value.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'))setUrl(value);
  else setError('Não foi possível preparar a autorização. Informe o Client ID e o Client secret do projeto Google.');
 }
 const configured=connection?.configured.google,checked=connection?.checked.google;
 return <section className="card gf-pad"><div className="work-title"><h2>Google Calendar</h2><span className={'status '+(checked?'green':'neutral')}>{checked?'Acesso testado':configured?'Autorizado · teste o acesso':'Não autorizado'}</span></div>
  <p>A agenda comercial é compartilhada. Os vendedores veem as reservas dos contatos da própria carteira; a autorização e a sincronização são controladas pelo gerente.</p>
  <details><summary>Configurar conexão Google</summary>
   <form onSubmit={authorize}><div className="form-grid">
    <label>Client ID Google<input required maxLength={4000} autoComplete="off" value={client} onChange={e=>setClient(e.target.value)} disabled={busy}/></label>
    <label>Client secret Google<input type="password" autoComplete="new-password" maxLength={4000} placeholder="Vazio mantém o segredo já informado" value={secret} onChange={e=>setSecret(e.target.value)} disabled={busy}/></label>
    <label>ID da agenda<input maxLength={4000} value={calendar} onChange={e=>setCalendar(e.target.value)} placeholder="primary" disabled={busy}/></label>
   </div><div className="gf-actions"><Button type="submit" variant="primary" disabled={busy}>Salvar e preparar autorização</Button></div></form>
   {url&&<p><a className="btn primary" href={url} target="_blank" rel="noopener noreferrer">Autorizar minha agenda Google</a></p>}
   {error&&<p role="alert" className="gf-error">{error}</p>}
   <p>Após autorizar no Google, volte à Agenda e atualize os dados. As credenciais desta configuração ficam disponíveis nesta sessão do servidor e precisam ser informadas novamente depois de reiniciar; variáveis de ambiente também são suportadas.</p>
   <details><summary>Preparar o projeto Google</summary><ol><li>No Google Cloud, crie ou selecione um projeto e ative a Google Calendar API.</li><li>Configure a tela de consentimento. Se o app estiver em teste e for externo à organização, inclua a conta que autorizará a agenda como usuário de teste.</li><li>Crie um cliente OAuth do tipo Aplicativo da Web. Cadastre este URI de redirecionamento autorizado: <code>http://127.0.0.1:8780/oauth/google/callback</code>.</li><li>Copie o Client ID e o Client secret para os campos acima. Use <code>primary</code> para a agenda principal ou o ID de uma agenda comercial dedicada.</li></ol><p><a href="https://developers.google.com/workspace/calendar/api/quickstart/python" target="_blank" rel="noopener noreferrer">Documentação oficial do Google Calendar</a></p></details>
  </details>
  <div className="gf-actions"><Button disabled={busy||!configured} onClick={async()=>{if(await act({action:'gf_connection_test',kind:'google'}))notify?.('Acesso à agenda Google testado.')}}>Testar acesso à agenda</Button><Button disabled={busy} onClick={async()=>{if(await act({action:'gf_google_forget'})){setClient('');setSecret('');setCalendar('primary');setUrl('');setError('');notify?.('Dados Google removidos desta sessão. Reservas e eventos existentes foram preservados.')}}}>Limpar dados desta sessão</Button></div>
  {checked&&<small>Último teste: {date(checked)}. Sincronizar envia os convites e cancelamentos pendentes.</small>}
 </section>;
}
```

## verificar_plataforma.py

```python
"""Read-only consistency checks. Never logs personal fields or connects external services."""
import argparse
import json
import os
from pathlib import Path
import sqlite3

PERMISSIONS={'create','edit','move','message','book','import','cadence'}
STAGES={'new','contacted','qualified','meeting','proposal','won','lost'}


def verify(path):
    checks=[]
    def add(name,ok,detail='',warning=False):
        checks.append({'check':name,'status':'ok' if ok else ('warning' if warning else 'failed'),'detail':detail})
    if not path.is_file():
        add('Banco existente',False,'Inicie a plataforma com a pasta de dados correta antes de verificar.')
        return checks
    db=sqlite3.connect(path.resolve().as_uri()+'?mode=ro',uri=True,timeout=10)
    db.row_factory=sqlite3.Row
    try:
        db.execute('BEGIN')
        tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        expected={'team_users','team_assignments','team_stages','leads','meetings','gf_calendar','wa_connections'}
        missing=expected-tables
        add('Estrutura da plataforma',not missing,'Tabelas ausentes: '+', '.join(sorted(missing)) if missing else '')
        if missing:return checks
        add('Integridade SQLite',all(r[0]=='ok' for r in db.execute('PRAGMA quick_check')))
        add('Referências entre registros',not db.execute('PRAGMA foreign_key_check').fetchone())
        managers=db.execute("SELECT count(*) FROM team_users WHERE role='manager' AND active=1").fetchone()[0]
        add('Gerente ativo',managers==1,'Quantidade: '+str(managers))
        sellers=db.execute("SELECT count(*) FROM team_users WHERE role='seller' AND active=1").fetchone()[0]
        add('Vendedores ativos',sellers>0,'Quantidade: '+str(sellers),warning=True)
        unassigned=db.execute('SELECT count(*) FROM leads l LEFT JOIN team_assignments a ON a.lead_id=l.id WHERE a.lead_id IS NULL').fetchone()[0]
        add('Carteiras atribuídas',unassigned==0,'Contatos sem responsável: '+str(unassigned))
        inactive=db.execute('SELECT count(*) FROM team_assignments a JOIN team_users u ON u.id=a.user_id WHERE u.active=0').fetchone()[0]
        add('Carteiras de usuários ativos',inactive==0,'Contatos com responsável inativo: '+str(inactive),warning=True)
        invalid=0
        for row in db.execute('SELECT permissions FROM team_users'):
            try:
                value=json.loads(row[0])
                if not isinstance(value,list) or any(p not in PERMISSIONS for p in value):invalid+=1
            except (ValueError,TypeError):invalid+=1
        add('Permissões reconhecidas',invalid==0,'Registros inválidos: '+str(invalid))
        invalid_stages=sum(1 for row in db.execute('SELECT stage FROM team_stages') if row[0] not in STAGES)
        add('Etapas comerciais reconhecidas',invalid_stages==0)
        conflicts=db.execute('''SELECT count(*) FROM meetings a JOIN meetings b ON a.id<b.id
            AND a.active=1 AND b.active=1 AND a.start<b.end AND a.end>b.start''').fetchone()[0]
        add('Reservas sem sobreposição',conflicts==0,'Conflitos locais: '+str(conflicts))
        return checks
    finally:db.close()


def main():
    default=Path(os.getenv('GF_SDR_DATA_DIR') or Path(os.getenv('LOCALAPPDATA',str(Path.home())))/'GrupoFrancaSDR')/'sdr.sqlite3'
    parser=argparse.ArgumentParser(description='Verificar a consistência da plataforma sem alterar dados.')
    parser.add_argument('--banco',type=Path,default=default)
    args=parser.parse_args()
    try:checks=verify(args.banco)
    except (sqlite3.Error,OSError):
        print('Não foi possível verificar o banco. Confira o acesso e tente com a plataforma fechada.')
        return 1
    for item in checks:
        label={'ok':'OK','warning':'ATENÇÃO','failed':'FALHA'}[item['status']]
        print(f"[{label}] {item['check']}"+(f" — {item['detail']}" if item['detail'] else ''))
    print('\nVerificação interna concluída. O teste não acessa WhatsApp ou Google e não substitui o teste de login de vendedor.')
    return int(any(item['status']=='failed' for item in checks))


if __name__=='__main__':raise SystemExit(main())
```
