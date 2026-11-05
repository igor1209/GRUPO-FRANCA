import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend import main
from backend.core import Store

class MigrationAPITests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.base=Path(self.temp.name)
        old=Store(self.base/'sdr.sqlite3')
        self.lid=old.create('Contato antigo','Empresa antiga','old@example.test')
        old.message(self.lid,'user','Mensagem anterior preservada')
        old.message(self.lid,'human','Resposta antiga')
        old.db.close()
        self.patches=[patch.object(main,'BASE',self.base),patch.object(main,'DB',self.base/'sdr.sqlite3')]
        for p in self.patches:p.start()
        self.client=TestClient(main.app,base_url='http://127.0.0.1:8780')
        self.client.__enter__()
        self.headers={'X-SDR-Token':self.client.get('/api/session').json()['token']}
        self.client.post('/api/auth/setup',json={'password':'Test.Manager.2030'},headers=self.headers)
    def tearDown(self):
        self.client.__exit__(None,None,None)
        for p in self.patches:p.stop()
        self.temp.cleanup()
    def post(self,data):return self.client.post('/api/action',json=data,headers=self.headers)
    def state(self):return self.client.get('/api/state',headers=self.headers).json()
    def test_old_data_and_backup_preserved(self):
        self.assertEqual(self.state()['leads'][0]['company'],'Empresa antiga')
        contact=self.client.get('/api/contact',params={'id':self.lid},headers=self.headers).json()
        self.assertIn('Mensagem anterior preservada',[m['text'] for m in contact['messages']])
        backups=list((self.base/'backups').glob('*.sqlite3'))
        self.assertEqual(len(backups),1)
        with sqlite3.connect(backups[0]) as db:
            self.assertEqual(db.execute('select count(*) from leads').fetchone()[0],1)
    def test_session_host_and_origin(self):
        self.assertEqual(self.client.get('/api/state').status_code,403)
        self.assertEqual(self.client.get('/api/session',headers={'Host':'attacker.test'}).status_code,400)
        self.assertEqual(self.client.post('/api/action',json={'action':'create','name':'x'},headers={**self.headers,'Origin':'https://attacker.test'}).status_code,403)
    def test_conversation_and_booking_flow(self):
        r=self.post({'action':'create','name':'Ana','company':'Empresa Nova'})
        self.assertEqual(r.status_code,200)
        lid=r.json()['id']
        for text in ['sim','Não conseguimos captar clientes além das indicações.','Queremos aumentar a aquisição de clientes.','Nos próximos três meses','sim','1','sim']:
            r=self.post({'action':'send','id':lid,'text':text})
            self.assertEqual(r.status_code,200,r.text)
        lead=next(l for l in self.state()['leads'] if l['id']==lid)
        self.assertEqual(lead['phase'],'booked')
        meeting=next(m for m in self.state()['meetings'] if m['lead_id']==lid)
        self.assertEqual(self.post({'action':'cancel','id':lid,'meeting':meeting['id']}).status_code,200)
    def test_cadence_edit_and_block(self):
        self.assertEqual(self.post({'action':'profile','id':self.lid,'tags':'B2B, prioridade','owner':'Pierre'}).status_code,200)
        self.assertEqual(self.post({'action':'cadence_save','name':'Fluxo de teste','steps':[{'kind':'task','text':'Pesquisar','hours':0},{'kind':'wait','text':'','hours':24}]}).status_code,200)
        cid=self.state()['workspace']['cadences'][0]['id']
        self.assertEqual(self.post({'action':'cadence_assign','id':self.lid,'cadence':cid}).status_code,200)
        self.assertEqual(self.post({'action':'cadence_assign','id':self.lid,'cadence':cid}).status_code,409)
        self.assertEqual(self.post({'action':'cadence_next','id':self.lid}).status_code,200)
        self.assertEqual(self.post({'action':'cadence_next','id':self.lid}).status_code,400)
        self.assertEqual(self.post({'action':'block','id':self.lid}).status_code,200)
        self.assertEqual(self.state()['workspace']['runs'][0]['status'],'cancelled')
        self.assertEqual(self.post({'action':'send','id':self.lid,'text':'teste'}).status_code,400)
    def test_secret_not_returned_or_persisted(self):
        r=self.post({'action':'config','key':'FAKE_TEST_SECRET'})
        self.assertEqual(r.status_code,200)
        self.assertNotIn('FAKE_TEST_SECRET',str(self.state()))
        with sqlite3.connect(main.DB) as db:
            self.assertNotIn('FAKE_TEST_SECRET',str(db.execute('select * from settings').fetchall()))
        main.service.key=''
    def test_invalid_input_and_duplicate(self):
        self.assertEqual(self.post({'action':'create','name':''}).status_code,400)
        self.assertEqual(self.post({'action':'create','name':'Duplicado','contact':'old@example.test'}).status_code,409)
        self.assertEqual(self.post({'action':'cadence_save','name':'Teste','steps':['invalid']}).status_code,400)
        self.assertEqual(self.post({'action':'notes','id':self.lid,'followup':'2020-01-01T10:00'}).status_code,400)
        self.assertEqual(self.client.get('/api/contact?id=999999',headers=self.headers).status_code,404)

    def test_pausing_automatic_mode_does_not_wait_for_network_operation_lock(self):
        main.RUNTIME.automation['enabled']=True
        main.service.lock.acquire()
        try:
            self.assertEqual(self.post({'action':'gf_automation','enabled':False}).status_code,200)
            self.assertFalse(main.RUNTIME.automation['enabled'])
        finally:
            main.service.lock.release()

if __name__=='__main__': unittest.main()
