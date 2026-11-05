import contextlib
import importlib.util
import json
import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend import core as s

BASE = datetime(2026, 10, 28, 20, 0)

class CoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = s.Store(Path(self.tmp.name) / 'test.sqlite3')
        self.clock = patch.object(s, 'now', return_value=BASE)
        self.clock.start()
        self.cfg = dict(s.DEFAULTS)
        self.lid = self.store.create('Teste', 'Tecnologia', 'teste@example.test')

    def tearDown(self):
        self.store.db.close()
        self.clock.stop()
        self.tmp.cleanup()

    def turn(self, text, lid=None):
        lid = lid or self.lid
        lead = self.store.lead(lid)
        self.store.message(lid, 'user', text)
        answer = s.apply_turn(self.store, lid, text, s.Provider.rules(text, lead['phase']), self.cfg)
        self.store.message(lid, 'assistant', answer, 'Regras (teste)')
        return answer

    def test_four_yes_do_not_schedule(self):
        for _ in range(4):
            self.turn('sim')
        self.assertEqual(self.store.lead(self.lid)['phase'], 'need')
        self.assertEqual(self.store.lead(self.lid)['need'], '')
        self.assertEqual(self.store.meetings(), [])

    def test_real_flow_and_restart(self):
        self.turn('Sim')
        need = 'Não conseguimos clientes além das indicações.'
        self.turn(need)
        self.assertEqual(self.store.lead(self.lid)['need'], need)
        self.turn('sim')
        self.turn('sim')
        self.assertEqual(self.store.lead(self.lid)['phase'], 'schedule')
        self.turn('1')
        self.assertEqual(self.store.lead(self.lid)['phase'], 'confirm')
        self.turn('sim')
        self.assertEqual(self.store.lead(self.lid)['phase'], 'booked')
        self.assertEqual(len(self.store.meetings()), 1)
        path = self.store.path
        self.store.db.close()
        self.store = s.Store(path)
        self.assertEqual(self.store.lead(self.lid)['need'], need)
        self.assertEqual(len(self.store.meetings()), 1)
        self.assertIn('RELATO LITERAL', self.store.summary(self.lid))

    def test_no_interest_blocks_and_clears_followup(self):
        self.store.update(self.lid, followup='2026-11-01T10:00:00')
        self.turn('Não tenho interesse, remova meu contato')
        lead = self.store.lead(self.lid)
        self.assertTrue(lead['blocked'])
        self.assertTrue(lead['paused'])
        self.assertEqual(lead['followup'], '')
        self.assertEqual(lead['phase'], 'stopped')

    def test_price_does_not_become_need(self):
        self.turn('sim')
        answer = self.turn('Quanto custa?')
        self.assertIn('valores', answer)
        self.assertEqual(self.store.lead(self.lid)['phase'], 'need')
        self.assertFalse(self.store.lead(self.lid)['need'])

    def test_need_with_negative_language_is_not_rejection(self):
        self.turn('sim')
        self.turn('Não temos entrada constante de clientes.')
        lead = self.store.lead(self.lid)
        self.assertEqual(lead['phase'], 'invite')
        self.assertFalse(lead['blocked'])

    def test_pause_for_human(self):
        self.turn('Quero falar com Igor')
        self.assertTrue(self.store.lead(self.lid)['paused'])

    def test_decline_at_opening_pauses(self):
        self.turn('não')
        self.assertEqual(self.store.lead(self.lid)['phase'], 'paused')

    def test_inbound_starts_at_need(self):
        lid = self.store.create('Nome', 'Empresa', '', 'Inbound', 'B2C')
        self.assertEqual(self.store.lead(lid)['phase'], 'need')
        self.turn('Precisamos organizar o nosso funil de vendas.', lid)
        self.assertEqual(self.store.lead(lid)['phase'], 'invite')

    def test_date_parsing(self):
        cases = {'amanhã às 17h': datetime(2026,10,29,17),
                 'terça-feira 17:30': datetime(2026,11,3,17,30),
                 '03/11/2026 às 17h': datetime(2026,11,3,17),
                 '03/11/2026 17:00': datetime(2026,11,3,17),
                 'hoje 21h': datetime(2026,10,28,21)}
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertEqual(s.parse_date(text), expected)

    def test_date_selection(self):
        slots = self.store.slots(self.cfg, self.lid)
        self.assertEqual(s.parse_date('2',slots).isoformat(),slots[1])
        self.assertEqual(len(slots),3)

    def test_invalid_dates(self):
        for text in ('sim', 'amanhã', '17h', '31/02/2027 17:00', '03/11/2026 25:00', 'ontem 17h'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                s.parse_date(text)

    def test_invalid_slots(self):
        for dt in (datetime(2026,10,28,17),datetime(2026,10,31,10),
                   datetime(2026,10,29,12), datetime(2026,10,29,18),
                   datetime(2026,10,29,9,15), datetime(2026,10,29,8)):
            with self.subTest(dt=dt), self.assertRaises(ValueError):
                self.store.validate_slot(dt,self.cfg)

    def test_midnight_closing(self):
        self.store.validate_slot(datetime(2026,10,29,23,30),dict(self.cfg,end=24),self.lid)

    def test_conflict_rolls_back(self):
        value = '2026-10-29T10:00:00'
        self.store.reserve(self.lid,value,self.cfg)
        other = self.store.create('Outro','Outro','outro@example.test')
        with self.assertRaises(ValueError):
            self.store.reserve(other,value,self.cfg)
        self.assertEqual(len(self.store.meetings()),1)
        self.assertNotEqual(self.store.lead(other)['phase'],'booked')
        # A failed change preserves the old reservation.
        self.store.reserve(other,'2026-10-29T11:00:00',self.cfg)
        with self.assertRaises(ValueError):
            self.store.reserve(self.lid,'2026-10-29T11:00:00',self.cfg)
        active = [m for m in self.store.meetings() if m['lead_id']==self.lid]
        self.assertEqual(active[0]['start'],value)

    def test_no_duplicate_active_meeting(self):
        self.store.reserve(self.lid,'2026-10-29T10:00:00',self.cfg)
        self.store.reserve(self.lid,'2026-10-29T11:00:00',self.cfg)
        self.assertEqual(len(self.store.meetings()),1)

    def test_final_confirmation_rechecks_conflict(self):
        self.turn('sim')
        self.turn('Precisamos melhorar nossa aquisição de clientes.')
        self.turn('sim')
        self.turn('1')
        proposed=self.store.lead(self.lid)['proposed']
        other=self.store.create('Outro','Outro','')
        self.store.reserve(other,proposed,self.cfg)
        answer=self.turn('sim')
        self.assertIn('ocupado', answer)
        self.assertEqual(self.store.lead(self.lid)['phase'],'schedule')
        self.assertEqual(len(self.store.meetings()),1)

    def test_need_quote_must_exist_in_input(self):
        result={'intent':'statement','need_quote':'Empresa sem vendas e com dívidas.', 'answer':''}
        s.apply_turn(self.store,self.lid,'sim',result,self.cfg)
        self.assertEqual(self.store.lead(self.lid)['need'],'')

    def test_filler_is_not_need(self):
        for text in ('sim', 'sim sim sim sim', 'sim claro pode continuar'):
            self.assertFalse(s.substantial(text))

    def test_contact_dedup_and_sql_parameters(self):
        self.store.create("O'Neil",'X','(81) 99999-9999')
        with self.assertRaises(sqlite3.IntegrityError):
            self.store.create('Duplicate','Y','81999999999')
        self.store.create('Sem endereço','A','')
        self.store.create('Sem endereço 2','B','')
        self.assertEqual(len(self.store.leads()),4)

    def test_usage_limit_and_no_key_persisted(self):
        config=dict(self.cfg,provider='OpenAI',daily_limit=1)
        self.store.start_usage(config)
        with self.assertRaises(ValueError):
            self.store.start_usage(config)
        self.store.save_config(dict(config, api_key='SECRET_SENTINEL'))
        rows=self.store.db.execute('SELECT * FROM settings').fetchall()
        self.assertNotIn('SECRET_SENTINEL',str([tuple(r) for r in rows]))

    def test_backup_integrity(self):
        path=Path(self.tmp.name)/'backup.sqlite3'
        with sqlite3.connect(path) as target:
            self.store.db.backup(target)
        with sqlite3.connect(path) as target:
            self.assertEqual(target.execute('PRAGMA integrity_check').fetchone()[0],'ok')
            self.assertEqual(target.execute('SELECT COUNT(*) FROM leads').fetchone()[0],1)


class APIContractTests(unittest.TestCase):
    def setUp(self):
        self.cfg=dict(s.DEFAULTS,provider='OpenAI')
        self.lead={'phase':'need','need':''}
        self.messages=[{'role':'user','text':'Dependemos muito de indicação para vender.'}]
        self.result={'intent':'statement','need_quote':self.messages[0]['text'],'answer':''}
        self.calls=[]

    def mock_open(self, data):
        outer=self
        class Response:
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def read(self,*args): return json.dumps(data).encode()
        class Opener:
            def open(self,request,timeout):
                outer.calls.append((request,timeout))
                return Response()
        return patch.object(s.urllib.request,'build_opener',return_value=Opener())

    def openai_data(self, result=None):
        return {'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps(result or self.result)}]}],'usage':{'total_tokens':123}}

    def test_openai_contract(self):
        with self.mock_open(self.openai_data()):
            result,tokens=s.Provider.interpret(self.cfg,'test-key',self.lead,self.messages)
        request,timeout=self.calls[0]
        body=json.loads(request.data)
        self.assertEqual(request.full_url,'https://api.openai.com/v1/responses')
        self.assertEqual(request.get_header('Authorization'),'Bearer test-key')
        self.assertFalse(body['store'])
        self.assertEqual(body['text']['format']['type'],'json_schema')
        self.assertEqual(body['text']['format']['schema'],s.SCHEMA)
        self.assertEqual(result['need_quote'],self.result['need_quote'])
        self.assertEqual(tokens,123)

    def test_refusal_or_incomplete_no_state_effect(self):
        with self.mock_open({'status':'incomplete'}), self.assertRaises(ValueError):
            s.Provider.interpret(self.cfg,'key',self.lead,self.messages)

    def test_bad_json_rejected(self):
        data=self.openai_data()
        data['output'][0]['content'][0]['text']='not json'
        with self.mock_open(data),self.assertRaises(ValueError):
            s.Provider.interpret(self.cfg,'key',self.lead,self.messages)

    def test_unfounded_quote_removed(self):
        result=dict(self.result,need_quote='Preciso de um CRM e de marketing')
        with self.mock_open(self.openai_data(result)):
            result,_=s.Provider.interpret(self.cfg,'key',self.lead,self.messages)
        self.assertEqual(result['need_quote'],'')

    def test_fabricated_commitment_replaced(self):
        result=dict(self.result,answer='Reunião agendada e link enviado!')
        with self.mock_open(self.openai_data(result)):
            result,_=s.Provider.interpret(self.cfg,'key',self.lead,self.messages)
        self.assertNotIn('agendada',result['answer'])

    def test_missing_key(self):
        with self.assertRaises(ValueError):
            s.Provider.interpret(self.cfg,'',self.lead,self.messages)

    def test_ollama_contract(self):
        config=dict(self.cfg,provider='Ollama local',local_model='test-model')
        data={'message':{'content':json.dumps(self.result)},'prompt_eval_count':20,'eval_count':10}
        with self.mock_open(data):
            _,tokens=s.Provider.interpret(config,'SECRET_MUST_NOT_LEAK',self.lead,self.messages)
        request,_=self.calls[0]
        body=json.loads(request.data)
        self.assertEqual(request.full_url,'http://localhost:11434/api/chat')
        self.assertIsNone(request.get_header('Authorization'))
        self.assertEqual(body['format'],s.SCHEMA)
        self.assertFalse(body['stream'])
        self.assertEqual(tokens,30)

    def test_nonlocal_ollama_rejected(self):
        for endpoint in ('https://elsewhere.example','http://localhost.evil:11434','http://user@localhost:11434','http://localhost:11434/path'):
            with self.subTest(endpoint=endpoint), self.assertRaises(ValueError):
                s.Provider.interpret(dict(self.cfg,provider='Ollama local',local_model='model',local_url=endpoint),'key',self.lead,self.messages)


if __name__ == '__main__':
    unittest.main(verbosity=2)
