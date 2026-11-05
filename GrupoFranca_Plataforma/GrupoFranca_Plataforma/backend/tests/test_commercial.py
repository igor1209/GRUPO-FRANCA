import email
import json
import smtplib
import tempfile
import unittest
from datetime import datetime, timedelta
from email.message import EmailMessage
from pathlib import Path
from unittest.mock import MagicMock, patch

from backend import franca_ai as ai
from backend.commercial import GrowthService, GrowthStore
from backend.connectors import Credentials, GoogleCalendar, Mail, RemoteError
from backend.core import now


class CommercialTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = GrowthStore(Path(self.temp.name) / 'test.sqlite3')
        self.store.credentials = Credentials()
        self.service = GrowthService()
        self.lid = self.run_action('gf_profile', name='Ana', company='Empresa', email='ana@example.test', contact='(81) 99999-0000', segment='Tecnologia', source='Lista Recife')['id']

    def tearDown(self):
        self.store.db.close()
        self.temp.cleanup()

    def run_action(self, action, **data):
        return self.service.execute(self.store, {'action': action, **data})

    def message(self, text, sender='ana@example.test', mid='one@example.test'):
        message = EmailMessage()
        message['From'] = sender
        message['To'] = 'igor@example.test'
        message['Subject'] = 'Conversa comercial'
        message['Message-ID'] = '<' + mid + '>'
        message.set_content(text)
        return message

    def receive(self, text, **kwargs):
        return self.service.receive(self.store, self.message(text, **kwargs), 'account', '1', 1)

    def draft(self, **kwargs):
        return self.run_action('gf_mail_draft', id=self.lid, **{'mode': 'manual', 'body': 'Olá, podemos conversar?', **kwargs})['id']

    def smtp_ready(self):
        self.store.credentials.configure({'GF_SMTP_HOST':'smtp.example.test','GF_MAIL_USER':'igor','GF_MAIL_PASSWORD':'FAKE_SECRET','GF_MAIL_FROM':'igor@example.test'})

    def google_ready(self):
        self.store.credentials.configure({'GF_GOOGLE_CLIENT_ID':'test','GF_GOOGLE_CLIENT_SECRET':'FAKE_GOOGLE','GF_GOOGLE_REFRESH_TOKEN':'FAKE_REFRESH'})

    def slot(self):
        return self.store.slots(self.store.config(), self.lid)[0]

    def test_import_duplicates_email_phone_batch_and_repeat_commit(self):
        preview = self.run_action('gf_import_preview', csv='Nome;Empresa;Telefone;E-mail;Segmento;Fonte\nOutra;Outra;+55 81 99999-0000;;Contabilidade;Mapa\nBia;Bia;;bia@example.test;Clínica;Mapa\nBia repetida;;;BIA@example.test;;\nSem dados;;;;;')
        self.assertEqual([r['status'] for r in preview['rows']], ['duplicate','ready','duplicate','ready'])
        first = self.run_action('gf_import_commit', batch=preview['batch'])
        self.assertEqual((first['created'], first['skipped']), (2, 2))
        self.assertEqual(self.run_action('gf_import_commit', batch=preview['batch']), first)
        self.assertEqual(len(self.store.leads()), 3)

    def test_import_invalid_email_and_mapping(self):
        preview = self.run_action('gf_import_preview', csv='Razão;Pessoa;Correio\nEmpresa A;Bia;inválido\nEmpresa B;Caio;caio@example.test', mapping={'company':'Razão','name':'Pessoa','email':'Correio'})
        self.assertEqual(preview['rows'][0]['status'], 'invalid')
        self.assertEqual(self.run_action('gf_import_commit', batch=preview['batch'])['created'], 1)

    def test_import_rechecks_duplicates_created_after_preview(self):
        preview = self.run_action('gf_import_preview', csv='Nome,E-mail\nBia,bia@example.test')
        self.run_action('gf_profile', name='Bia já cadastrada', email='bia@example.test')
        self.assertEqual(self.run_action('gf_import_commit', batch=preview['batch'])['created'], 0)

    def test_import_is_atomic_on_unexpected_failure(self):
        preview = self.run_action('gf_import_preview', csv='Nome,E-mail\nBia,bia@example.test\nCaio,caio@example.test')
        original = self.store.insert_profile
        def insert(row):
            if row['name'] == 'Caio':
                raise RuntimeError('test failure')
            return original(row)
        with patch.object(self.store, 'insert_profile', side_effect=insert):
            with self.assertRaises(RuntimeError):
                self.run_action('gf_import_commit', batch=preview['batch'])
        self.assertEqual(len(self.store.leads()), 1)
        self.assertEqual(self.run_action('gf_import_commit', batch=preview['batch'])['created'], 2)

    def test_profile_duplicate_and_block_preserve_history(self):
        with self.assertRaisesRegex(ValueError, 'duplicado'):
            self.run_action('gf_profile', name='Outro', email='ANA@example.test')
        before = self.store.messages(self.lid)
        pending = self.draft()
        self.run_action('block', id=self.lid)
        self.assertEqual(self.store.db.execute('SELECT status FROM gf_mail WHERE id=?', (pending,)).fetchone()[0], 'cancelled')
        self.assertGreater(len(self.store.messages(self.lid)), len(before))

    def test_train_own_model_and_export_no_credentials(self):
        self.run_action('gf_example', text='nosso gargalo é a conversão comercial', label='statement')
        version = self.run_action('gf_train')
        self.assertEqual(version['version'], 1)
        self.assertIn(('nosso gargalo é a conversão comercial','statement'), [tuple(pair) for pair in ai.dataset(self.store)])
        self.assertEqual(self.run_action('gf_ai_test', text='nosso gargalo é a conversão comercial')['intent'], 'statement')
        self.assertNotIn('FAKE_SECRET', json.dumps(self.run_action('gf_ai_export')))

    def test_own_qualification_and_booking_flow(self):
        self.run_action('config', provider='França IA')
        for text in ['sim','Dependemos de indicações para captar clientes.','Queremos aumentar a aquisição de clientes.','Nos próximos três meses','sim','1','sim']:
            self.run_action('send', id=self.lid, text=text)
        self.assertEqual(self.store.lead(self.lid)['phase'], 'booked')
        self.assertEqual(self.store.profile(self.lid)['goal'], 'Queremos aumentar a aquisição de clientes.')
        self.assertEqual(self.store.profile(self.lid)['qualified'], 1)
        report = self.store.metrics('2000-01-01','2100-01-01')
        self.assertTrue(all(value == 0 for value in report['counts'].values()))
        with patch.object(self.store.calendar(), 'sync') as sync:
            self.assertEqual(self.store.db.execute('SELECT status FROM gf_calendar').fetchone()[0], 'local_test')
            sync.assert_not_called()

    def test_stop_and_human_override_training(self):
        self.run_action('gf_example', text='Não me envie mais nada', label='yes')
        self.run_action('gf_train')
        self.assertEqual(ai.classify(self.store,'Não me envie mais nada')['intent'], 'stop')
        self.assertEqual(ai.classify(self.store,'quero falar com um humano')['intent'], 'human')

    def test_questions_retrieve_only_approved_answers_and_abstain(self):
        answer, key = ai.approved_answer(self.store, 'quanto custa o serviço?')
        self.assertIn('valores', answer)
        self.assertIsNotNone(key)
        answer, key = ai.approved_answer(self.store, 'explique fotossíntese quântica')
        self.assertIsNone(key)
        self.assertIn('Igor', answer)

    def test_inbound_duplicate_replay_and_quoted_optout(self):
        self.assertTrue(self.receive('Gostaria de conhecer a operação.\n> Não envie mais mensagens'))
        self.assertFalse(self.receive('Gostaria de conhecer a operação.'))
        self.assertFalse(self.store.lead(self.lid)['blocked'])
        self.assertEqual(self.store.db.execute("SELECT count(*) FROM gf_events WHERE kind='received'").fetchone()[0], 1)

    def test_inbound_optout_blocks_pending_and_human_pauses(self):
        pending = self.draft()
        self.receive('Não me envie mais nada')
        self.assertTrue(self.store.lead(self.lid)['blocked'])
        self.assertEqual(self.store.db.execute('SELECT status FROM gf_mail WHERE id=?',(pending,)).fetchone()[0], 'cancelled')
        with self.assertRaises(ValueError):
            self.draft()

    def test_new_inbound_only_when_enabled(self):
        self.assertFalse(self.receive('Olá, quero conversar', sender='novo@example.test'))
        self.store.credentials.configure({'GF_MAIL_NEW_SENDERS':'1'})
        self.assertTrue(self.receive('Olá, quero conversar', sender='novo@example.test'))
        self.assertEqual(self.store.leads()[0]['origin'], 'Inbound')

    def test_sending_is_explicit_idempotent_and_manual_pauses(self):
        self.smtp_ready()
        pending = self.draft()
        with patch('backend.commercial.Mail.send', return_value=('sent','')) as send:
            with self.assertRaises(ValueError):
                self.run_action('gf_mail_send', mail=pending)
            self.assertEqual(self.run_action('gf_mail_send', mail=pending, confirmed=True)['status'], 'sent')
            self.run_action('gf_mail_send', mail=pending, confirmed=True)
            self.assertEqual(send.call_count, 1)
        self.assertTrue(self.store.lead(self.lid)['paused'])
        report = self.store.metrics('2000-01-01','2100-01-01')
        self.assertEqual(report['counts']['sent'], 1)

    def test_send_unknown_never_retries_without_reconciliation(self):
        self.smtp_ready()
        pending = self.draft()
        with patch('backend.commercial.Mail.send', return_value=('unknown','timeout')) as send:
            self.run_action('gf_mail_send', mail=pending, confirmed=True)
            with self.assertRaises(ValueError):
                self.run_action('gf_mail_send', mail=pending, confirmed=True)
            self.assertEqual(send.call_count, 1)
        self.run_action('gf_mail_reconcile', mail=pending, resolution='sent')
        self.assertEqual(self.store.metrics('2000-01-01','2100-01-01')['counts']['sent'], 1)

    def test_ai_draft_does_not_advance_or_count_until_smtp_acceptance(self):
        self.smtp_ready()
        self.receive('sim')
        pending = self.draft(mode='ai')
        self.assertEqual(self.store.lead(self.lid)['phase'], 'opening')
        with patch('backend.commercial.Mail.send', return_value=('failed','rejected')):
            self.run_action('gf_mail_send', mail=pending, confirmed=True)
        self.assertEqual(self.store.lead(self.lid)['phase'], 'opening')
        with patch('backend.commercial.Mail.send', return_value=('sent','')):
            self.run_action('gf_mail_send', mail=pending, confirmed=True)
        self.assertEqual(self.store.lead(self.lid)['phase'], 'need')

    def test_new_inbound_invalidates_old_draft(self):
        self.smtp_ready()
        pending = self.draft()
        self.receive('Tenho uma outra dúvida')
        with patch('backend.commercial.Mail.send') as send:
            with self.assertRaisesRegex(ValueError, 'outra mensagem'):
                self.run_action('gf_mail_send', mail=pending, confirmed=True)
            send.assert_not_called()

    def test_credentials_are_session_only_and_snapshot_has_no_secrets(self):
        self.run_action('gf_credentials', GF_MAIL_PASSWORD='MY_SECRET', GF_GOOGLE_REFRESH_TOKEN='MY_REFRESH')
        snapshot = json.dumps(self.store.snapshot())
        self.assertNotIn('MY_SECRET', snapshot)
        self.assertNotIn('MY_REFRESH', snapshot)
        rows = str(self.store.db.execute('SELECT * FROM settings').fetchall())
        self.assertNotIn('MY_SECRET', rows)

    def test_calendar_local_conflict_and_test_not_synced(self):
        slot = self.slot()
        self.run_action('gf_book', id=self.lid, start=slot, attendee='ana@example.test')
        other = self.run_action('gf_profile', name='Bia', email='bia@example.test')['id']
        with self.assertRaisesRegex(ValueError, 'ocupado'):
            self.run_action('gf_book', id=other, start=slot)
        self.assertEqual(len(self.store.meetings()), 1)

    def test_google_busy_and_failure_do_not_create_false_reservation(self):
        slot = self.slot()
        self.google_ready()
        dt = datetime.fromisoformat(slot)
        with patch('backend.connectors.GoogleCalendar.busy', return_value=[(dt,dt+timedelta(minutes=30))]):
            with self.assertRaisesRegex(ValueError, 'Google'):
                self.run_action('gf_book', id=self.lid, start=slot)
        with patch('backend.connectors.GoogleCalendar.busy', side_effect=ValueError('offline')):
            with self.assertRaises(ValueError):
                self.run_action('gf_book', id=self.lid, start=slot)
        self.assertEqual(len(self.store.meetings()), 0)

    def test_external_sync_failure_can_retry_without_new_event_id(self):
        slot = self.slot()
        self.run_action('gf_book', id=self.lid, start=slot)
        event = self.store.db.execute('SELECT event_id FROM gf_calendar').fetchone()[0]
        self.google_ready()
        with patch('backend.connectors.GoogleCalendar.busy', return_value=[]), patch('backend.connectors.GoogleCalendar.sync', side_effect=ValueError('offline')):
            self.assertEqual(self.run_action('gf_sync')['synced'], 0)
        with patch('backend.connectors.GoogleCalendar.busy', return_value=[]), patch('backend.connectors.GoogleCalendar.sync', return_value={'htmlLink':'https://www.google.com/calendar/event'}) as sync:
            self.assertEqual(self.run_action('gf_sync')['synced'], 1)
            self.assertEqual(sync.call_args[0][0]['event_id'], event)
        self.assertEqual(len(self.store.meetings()), 1)

    def test_cancel_queues_external_cancellation_and_releases_slot(self):
        slot = self.slot()
        self.run_action('gf_book', id=self.lid, start=slot)
        meeting = self.store.meetings()[0]
        self.run_action('cancel', id=self.lid, meeting=meeting['id'])
        self.assertEqual(self.store.meetings(), [])
        row = self.store.db.execute('SELECT * FROM gf_calendar').fetchone()
        self.assertEqual((row['operation'],row['status']), ('cancel','pending'))

    def test_external_cancel_reconciles_local_state(self):
        self.run_action('gf_book', id=self.lid, start=self.slot())
        with self.store.db:
            self.store.db.execute("UPDATE gf_calendar SET status='synced',calendar_id='primary'")
        self.google_ready()
        with patch('backend.connectors.GoogleCalendar.request', return_value={'status':'cancelled'}):
            self.assertEqual(self.run_action('gf_calendar_read')['updated'], 1)
        self.assertEqual(self.store.meetings(), [])

    def test_metrics_source_date_unique_contacts_and_no_test_contamination(self):
        self.store.event(self.lid, 'sent', 'test')
        self.store.event(self.lid, 'sent', 'real')
        self.store.event(self.lid, 'sent', 'real')
        self.store.event(self.lid, 'received', 'real')
        self.run_action('gf_outcome', id=self.lid, outcome='won')
        report = self.store.metrics(now().date().isoformat(), now().date().isoformat(), 'Lista Recife')
        self.assertEqual((report['counts']['sent'], report['counts']['won']), (1,1))
        self.assertEqual(sum(row['sent'] for row in report['daily'].values()), 2)
        self.assertEqual(self.store.metrics('2000-01-01','2000-01-02')['counts']['sent'], 0)
        self.assertEqual(self.store.metrics('2000-01-01','2100-01-01','Outra fonte')['counts']['sent'], 0)

    def test_imap_baselines_then_deduplicates_repeated_poll(self):
        self.store.credentials.configure({'GF_IMAP_HOST':'imap.example.test','GF_MAIL_USER':'igor','GF_MAIL_PASSWORD':'fake'})
        connection=MagicMock()
        connection.response.return_value=('UIDVALIDITY',[b'123'])
        connection.uid.side_effect=lambda command,*args: ('OK',[b'10']) if command=='search' else ('OK',[])
        with patch('backend.commercial.Mail.imap', return_value=connection):
            self.assertTrue(self.run_action('gf_mail_poll')['initialized'])
        raw=self.message('Tenho interesse').as_bytes()
        def query(command,*args):
            if command=='search': return 'OK',[b'10 11']
            return ('OK',[b'11 (RFC822.SIZE 500)']) if 'SIZE' in args[-1] else ('OK',[(b'11',raw)])
        connection.uid.side_effect=query
        with patch('backend.commercial.Mail.imap', return_value=connection):
            self.assertEqual(self.run_action('gf_mail_poll')['added'],1)
            self.assertEqual(self.run_action('gf_mail_poll')['added'],0)

    def test_oauth_state_is_one_time_and_credentials_not_exposed(self):
        self.store.credentials.configure({'GF_GOOGLE_CLIENT_ID':'client','GF_GOOGLE_CLIENT_SECRET':'secret'})
        url = self.run_action('gf_google_authorize')['url']
        state = self.store.credentials.oauth[0]
        self.assertIn('accounts.google.com', url)
        with self.assertRaises(ValueError):
            self.store.credentials.finish_authorization('code','wrong-state')
        self.run_action('gf_google_authorize')
        state = self.store.credentials.oauth[0]
        with patch('backend.connectors.http_json', return_value={'refresh_token':'SECRET_REFRESH'}):
            self.store.credentials.finish_authorization('code',state)
        with self.assertRaises(ValueError):
            self.store.credentials.finish_authorization('code',state)
        self.assertNotIn('SECRET_REFRESH', json.dumps(self.store.snapshot()))

    def test_received_before_sent_same_second_not_a_response_to_approach(self):
        self.store.event(self.lid, 'received', 'real')
        self.store.event(self.lid, 'sent', 'real')
        report = self.store.metrics('2000-01-01','2100-01-01')
        self.assertEqual(report['counts']['received'],1)
        self.assertEqual(report['cohort']['received'],0)

    def test_simulator_cannot_advance_real_email_conversation(self):
        self.receive('Tenho interesse em conversar')
        with self.assertRaisesRegex(ValueError, 'atividade real'):
            self.run_action('send', id=self.lid, text='sim')
        self.assertEqual(self.store.lead(self.lid)['phase'],'opening')

    def test_promoting_test_lead_resets_fake_progress_preserves_history(self):
        for text in ['sim','Dependemos de indicações para captar clientes.']:
            self.run_action('send', id=self.lid, text=text)
        count = len(self.store.messages(self.lid))
        self.receive('Gostaria de conhecer a operação.')
        with self.assertRaisesRegex(ValueError, 'simulador'):
            self.draft(mode='ai')
        self.run_action('gf_start_real', id=self.lid)
        self.assertEqual(self.store.lead(self.lid)['phase'],'opening')
        self.assertEqual(self.store.lead(self.lid)['need'],'')
        self.assertGreater(len(self.store.messages(self.lid)),count)
        self.assertTrue(self.draft(mode='ai'))

    def test_reconciling_old_send_never_reverses_new_optout(self):
        self.smtp_ready()
        self.receive('sim')
        pending = self.draft(mode='ai')
        with patch('backend.commercial.Mail.send', return_value=('unknown','timeout')):
            self.run_action('gf_mail_send', mail=pending, confirmed=True)
        self.receive('Não me envie mais nada', mid='second@example.test')
        self.run_action('gf_mail_reconcile', mail=pending, resolution='sent')
        self.assertTrue(self.store.lead(self.lid)['blocked'])
        self.assertEqual(self.store.lead(self.lid)['phase'],'stopped')

    def test_smtp_acceptance_and_disconnect_are_distinct_transport_results(self):
        self.smtp_ready()
        pending = self.draft()
        row = dict(self.store.db.execute('SELECT * FROM gf_mail WHERE id=?',(pending,)).fetchone())
        connection = MagicMock()
        connection.send_message.return_value = {}
        with patch('backend.connectors.Mail.smtp', return_value=connection):
            self.assertEqual(Mail(self.store.credentials).send(row), ('sent',''))
        message = connection.send_message.call_args[0][0]
        self.assertEqual(message['To'],'ana@example.test')
        self.assertNotIn('FAKE_SECRET', message.as_string())
        connection.send_message.side_effect = smtplib.SMTPServerDisconnected('interrupted')
        with patch('backend.connectors.Mail.smtp', return_value=connection):
            self.assertEqual(Mail(self.store.credentials).send(row)[0],'unknown')

    def test_google_event_creation_retry_keeps_id_and_ownership(self):
        self.google_ready()
        calendar = self.store.calendar()
        row = {'event_id':'gf1234','meeting_id':1,'start':'2030-11-04T09:00:00','end':'2030-11-04T09:30:00','attendee':'ana@example.test','operation':'upsert'}
        with patch.object(calendar,'request',side_effect=[RemoteError(404),{'id':'gf1234'}]) as request:
            self.assertEqual(calendar.sync(row,self.store.lead(self.lid),'installation')['id'],'gf1234')
            self.assertEqual(request.call_args_list[1].args[2]['id'],'gf1234')
        with patch.object(calendar,'request',return_value={'extendedProperties':{'private':{'gf_installation':'other'}}}) as request:
            with self.assertRaisesRegex(ValueError,'não pertence'):
                calendar.sync(row,self.store.lead(self.lid),'installation')
            self.assertEqual(request.call_count,1)

    def test_business_pain_about_uninterested_leads_is_not_optout(self):
        result=ai.plan(self.store,self.lid,'Nossos leads estão sem interesse e não conseguimos vender.')
        self.assertEqual(result['changes']['need'],'Nossos leads estão sem interesse e não conseguimos vender.')
        self.assertNotEqual(result['intent'],'stop')

    def enable_automatic(self, limit=40):
        self.smtp_ready()
        self.store.credentials.configure({'GF_IMAP_HOST':'imap.example.test'})
        self.store.credentials.checked.update(smtp='tested',imap='tested')
        self.run_action('gf_automation',enabled=True,limit=limit)

    def test_automatic_mode_is_off_by_default_and_requires_tested_connections(self):
        with patch('backend.commercial.Mail.imap') as imap:
            self.service.automatic_tick(self.store)
            imap.assert_not_called()
        with self.assertRaisesRegex(ValueError,'SMTP'):
            self.run_action('gf_automation',enabled=True)

    def test_automatic_replies_once_only_after_opt_in_and_pauses_on_request(self):
        self.enable_automatic()
        self.receive('sim')
        with patch.object(self.service,'poll',return_value={'initialized':False}), patch('backend.commercial.Mail.send',return_value=('sent','')) as send:
            self.service.automatic_tick(self.store)
            self.service.automatic_tick(self.store)
            self.assertEqual(send.call_count,1)
        self.assertEqual(self.store.lead(self.lid)['phase'],'need')
        self.receive('quero falar com um humano',mid='human@example.test')
        with patch.object(self.service,'poll',return_value={'initialized':False}), patch('backend.commercial.Mail.send') as send:
            self.service.automatic_tick(self.store)
            send.assert_not_called()

    def test_automatic_daily_cap_and_no_retry_of_unknown_send(self):
        self.enable_automatic(limit=1)
        self.receive('sim')
        with patch.object(self.service,'poll',return_value={'initialized':False}), patch('backend.commercial.Mail.send',return_value=('unknown','timeout')) as send:
            self.service.automatic_tick(self.store)
            self.service.automatic_tick(self.store)
            self.assertEqual(send.call_count,1)
        other=self.run_action('gf_profile',name='Bia',email='bia@example.test')['id']
        self.receive('sim',sender='bia@example.test',mid='bia@example.test')
        with patch.object(self.service,'poll',return_value={'initialized':False}), patch('backend.commercial.Mail.send') as send:
            self.service.automatic_tick(self.store)
            send.assert_not_called()
        self.assertIn('Limite diário',self.store.credentials.automation['last_error'])

    def test_automatic_waits_until_imap_backlog_has_been_processed(self):
        self.enable_automatic()
        self.receive('sim')
        with patch.object(self.service,'poll',return_value={'initialized':False,'remaining':1}), patch('backend.commercial.Mail.send') as send:
            self.service.automatic_tick(self.store)
            send.assert_not_called()


if __name__ == '__main__':
    unittest.main()
