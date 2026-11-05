import json
import sqlite3
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend import main
from backend.team import TeamStore, DEFAULT_PERMISSIONS

class TeamAPITests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.base=Path(self.temp.name)
        self.patches=[patch.object(main,'BASE',self.base),patch.object(main,'DB',self.base/'sdr.sqlite3')]
        for p in self.patches:p.start()
        self.manager=TestClient(main.app,base_url='http://127.0.0.1:8780')
        self.manager.__enter__()
        self.headers={'X-SDR-Token':self.manager.get('/api/session').json()['token']}
        self.assertEqual(self.manager.post('/api/auth/setup',json={'password':'Manager.Password.2030'},headers=self.headers).status_code,200)
        self.a=self.add_user('Ana','ana')
        self.b=self.add_user('Bia','bia')
        self.ana=TestClient(main.app,base_url='http://127.0.0.1:8780')
        self.bia=TestClient(main.app,base_url='http://127.0.0.1:8780')
        for client,name in [(self.ana,'ana'),(self.bia,'bia')]:
            self.assertEqual(client.post('/api/auth/login',json={'username':name,'password':'Employee.Password.2030'},headers=self.headers).status_code,200)
            self.assertEqual(client.post('/api/auth/password',json={'current_password':'Employee.Password.2030','password':'Changed.Password.2030'},headers=self.headers).status_code,200)
        self.la=self.post(self.ana,{'action':'gf_profile','name':'Cliente Ana','email':'ana@example.test','company':'A','origin':'Outbound','target':'B2B'}).json()['id']
        self.lb=self.post(self.bia,{'action':'gf_profile','name':'Cliente Bia','email':'bia@example.test','company':'B','origin':'Outbound','target':'B2B'}).json()['id']

    def tearDown(self):
        self.ana.close();self.bia.close()
        self.manager.__exit__(None,None,None)
        for p in self.patches:p.stop()
        self.temp.cleanup()

    def post(self,client,data):return client.post('/api/action',json=data,headers=self.headers)
    def state(self,client):return client.get('/api/state',headers=self.headers).json()
    def add_user(self,name,username):
        response=self.post(self.manager,{'action':'team_user_create','name':name,'username':username,'password':'Employee.Password.2030','permissions':DEFAULT_PERMISSIONS})
        self.assertEqual(response.status_code,200,response.text)
        return response.json()['id']

    def test_one_manager_and_required_login(self):
        guest=TestClient(main.app,base_url='http://127.0.0.1:8780')
        self.assertEqual(guest.get('/api/state',headers=self.headers).status_code,401)
        self.assertEqual(guest.post('/api/auth/setup',json={'password':'Other.Password.2030'},headers=self.headers).status_code,400)
        self.assertNotIn('password',self.manager.get('/api/session').text)
        self.assertEqual(self.state(self.manager)['config']['provider'],'França IA')
        guest.close()

    def test_portfolios_are_filtered_and_cannot_be_read_directly(self):
        self.assertEqual([l['id'] for l in self.state(self.ana)['leads']],[self.la])
        self.assertEqual(self.state(self.ana)['team']['stages'][str(self.la)],'new')
        self.assertEqual({l['id'] for l in self.state(self.manager)['leads']},{self.la,self.lb})
        self.assertEqual(self.ana.get('/api/contact?id='+str(self.lb),headers=self.headers).status_code,403)
        self.assertNotIn('Cliente Bia',json.dumps(self.state(self.ana)))
        self.assertEqual(self.post(self.ana,{'action':'notes','id':self.lb,'notes':'invadido'}).status_code,403)
        self.assertEqual(self.post(self.ana,{'action':'team_move','id':self.lb,'stage':'won'}).status_code,403)

    def test_seller_cannot_manage_or_change_agent(self):
        for action in ['team_user_create','team_user_update','team_assign','team_management','config','gf_credentials','gf_automation','gf_example','gf_train','gf_knowledge','gf_mail_poll','unknown_new_action']:
            response=self.post(self.ana,{'action':action,'id':self.la,'enabled':False})
            self.assertEqual(response.status_code,403,(action,response.text))
        self.assertEqual(self.post(self.ana,{'action':'gf_import_preview','content':'Nome\nJoão'}).status_code,403)

    def test_move_preserves_ai_phase_and_does_not_create_meeting(self):
        for stage in ['contacted','qualified','meeting','proposal','won']:
            r=self.post(self.ana,{'action':'team_move','id':self.la,'stage':stage})
            self.assertEqual(r.status_code,200,r.text)
        state=self.state(self.ana)
        self.assertEqual(state['leads'][0]['phase'],'opening')
        self.assertEqual(state['meetings'],[])
        self.assertEqual(state['team']['stages'][str(self.la)],'won')
        report=self.post(self.manager,{'action':'team_management','start':'2000-01-01','end':'2100-01-01'}).json()
        row=next(r for r in report['rows'] if r['user']['id']==self.a)
        self.assertEqual(row['wins'],1)
        self.assertEqual(row['meetings'],0)
        metrics=self.post(self.ana,{'action':'gf_metrics','start':'2000-01-01','end':'2100-01-01'}).json()
        self.assertEqual(metrics['counts']['won'],1)
        self.post(self.ana,{'action':'team_move','id':self.la,'stage':'proposal'})
        report=self.post(self.manager,{'action':'team_management','start':'2000-01-01','end':'2100-01-01'}).json()
        self.assertEqual(next(r['wins'] for r in report['rows'] if r['user']['id']==self.a),0)
        self.assertEqual(self.post(self.ana,{'action':'gf_metrics','start':'2000-01-01','end':'2100-01-01'}).json()['counts']['won'],0)

    def test_reassignment_changes_visibility_and_records_actor(self):
        self.assertEqual(self.post(self.manager,{'action':'team_assign','id':self.la,'user_id':self.b}).status_code,200)
        self.assertEqual(self.state(self.ana)['leads'],[])
        self.assertEqual(len(self.state(self.bia)['leads']),2)
        self.assertEqual(self.post(self.ana,{'action':'team_move','id':self.la,'stage':'contacted'}).status_code,403)
        self.assertEqual(self.state(self.bia)['workspace']['meta'][str(self.la)]['owner'],'Bia')
        report=self.post(self.manager,{'action':'team_management','start':'2000-01-01','end':'2100-01-01'}).json()
        record=next(r for r in report['audit'] if r['action']=='team_assign')
        self.assertEqual(record['actor'],'Igor França')

    def test_blocked_lead_stays_blocked(self):
        self.post(self.ana,{'action':'block','id':self.la})
        self.assertEqual(self.post(self.ana,{'action':'team_move','id':self.la,'stage':'won'}).status_code,400)
        self.assertEqual(self.state(self.ana)['leads'][0]['blocked'],1)

    def test_permission_revocation_and_deactivation_invalidate_session(self):
        self.post(self.manager,{'action':'team_user_update','user_id':self.a,'permissions':[],'active':True})
        self.assertEqual(self.ana.get('/api/state',headers=self.headers).status_code,401)
        self.ana.post('/api/auth/login',json={'username':'ana','password':'Changed.Password.2030'},headers=self.headers)
        self.assertEqual(self.post(self.ana,{'action':'notes','id':self.la,'notes':'x'}).status_code,403)
        self.assertEqual(self.ana.get('/api/contact?id='+str(self.la),headers=self.headers).status_code,200)
        self.post(self.manager,{'action':'team_user_update','user_id':self.a,'permissions':[],'active':False})
        self.assertEqual(self.ana.post('/api/auth/login',json={'username':'ana','password':'Changed.Password.2030'},headers=self.headers).status_code,401)

    def test_mail_ids_cannot_bypass_ownership(self):
        r=self.post(self.ana,{'action':'gf_mail_draft','id':self.la,'mode':'manual','body':'Olá Ana'})
        self.assertEqual(r.status_code,200,r.text)
        mid=r.json()['id']
        for action in ['gf_mail_send','gf_mail_cancel']:
            self.assertEqual(self.post(self.bia,{'action':action,'mail':mid,'confirmed':True}).status_code,403)
        self.assertNotIn(mid,json.dumps(self.state(self.bia)))

    def test_passwords_and_session_tokens_are_not_persisted_in_plaintext(self):
        with sqlite3.connect(main.DB) as db:
            passwords=[r[0] for r in db.execute('SELECT password FROM team_users')]
            tokens=[r[0] for r in db.execute('SELECT token FROM team_sessions')]
            self.assertTrue(all('Password' not in p for p in passwords))
            self.assertNotIn(self.ana.cookies.get('gf_session'),tokens)
        response=self.ana.post('/api/auth/logout',json={},headers=self.headers)
        self.assertEqual(response.status_code,200)
        self.assertEqual(self.ana.get('/api/state',headers=self.headers).status_code,401)

    def test_metrics_sources_do_not_leak_other_portfolios(self):
        store=TeamStore(main.DB)
        store.save_profile(self.la,{'source':'Fonte Ana'})
        store.save_profile(self.lb,{'source':'Fonte Bia'})
        store.event(self.la,'sent','real');store.event(self.lb,'sent','real')
        store.db.close()
        report=self.post(self.ana,{'action':'gf_metrics','start':'2000-01-01','end':'2100-01-01'}).json()
        self.assertEqual(report['counts']['sent'],1)
        self.assertEqual(report['sources'],['Fonte Ana'])

    def test_initial_password_change_is_required_and_manager_is_immutable(self):
        uid=self.add_user('Caio','caio')
        client=TestClient(main.app,base_url='http://127.0.0.1:8780')
        client.post('/api/auth/login',json={'username':'caio','password':'Employee.Password.2030'},headers=self.headers)
        self.assertEqual(client.get('/api/state',headers=self.headers).status_code,403)
        manager=self.state(self.manager)['user']
        self.assertEqual(self.post(self.manager,{'action':'team_user_update','user_id':manager['id'],'active':False}).status_code,400)
        client.close()

    def test_login_throttle_and_expired_session(self):
        guest=TestClient(main.app,base_url='http://127.0.0.1:8780')
        for _ in range(8):guest.post('/api/auth/login',json={'username':'does-not-exist','password':'wrong'},headers=self.headers)
        r=guest.post('/api/auth/login',json={'username':'does-not-exist','password':'wrong'},headers=self.headers)
        self.assertIn('tentativas',r.json()['error'])
        with sqlite3.connect(main.DB) as db:db.execute('UPDATE team_sessions SET expires=0')
        self.assertEqual(self.ana.get('/api/state',headers=self.headers).status_code,401)
        guest.close()

    def test_create_assigns_selected_owner_and_seller_cannot_spoof_owner(self):
        r=self.post(self.manager,{'action':'gf_profile','name':'Contato direto Ana','contact':'81999990011','owner_id':self.a})
        self.assertEqual(r.status_code,200,r.text)
        lid=r.json()['id']
        self.assertIn(lid,[l['id'] for l in self.state(self.ana)['leads']])
        r=self.post(self.ana,{'action':'gf_profile','name':'Tentativa','contact':'81999990012','owner_id':self.b})
        self.assertEqual(r.status_code,403)
        self.assertNotIn('Tentativa',[l['name'] for l in self.state(self.manager)['leads']])

    def test_bulk_distribution_validates_whole_batch_and_replay_is_noop(self):
        self.assertEqual(self.post(self.manager,{'action':'team_assign_many','ids':[self.la,999999],'user_id':self.b}).status_code,400)
        self.assertEqual([l['id'] for l in self.state(self.ana)['leads']],[self.la])
        self.assertEqual(self.post(self.ana,{'action':'team_assign_many','ids':[self.la],'user_id':self.b}).status_code,403)
        result=self.post(self.manager,{'action':'team_assign_many','ids':[self.la,self.lb],'user_id':self.b}).json()
        self.assertEqual(result['changed'],1)
        self.assertEqual(self.state(self.ana)['leads'],[])
        self.assertEqual(self.post(self.manager,{'action':'team_assign_many','ids':[self.la,self.lb],'user_id':self.b}).json()['changed'],0)

    def test_import_assigns_target_and_does_not_reassign_on_repeated_commit(self):
        preview=self.post(self.manager,{'action':'gf_import_preview','csv':'Nome;Empresa;Telefone / contato\nContato importado;Teste;81999990013'}).json()
        self.assertEqual(preview['rows'][0]['row']['contact'],'81999990013')
        result=self.post(self.manager,{'action':'gf_import_commit','batch':preview['batch'],'owner_id':self.a}).json()
        self.assertEqual(result['created'],1)
        lid=result['ids'][0]
        self.assertIn(lid,[l['id'] for l in self.state(self.ana)['leads']])
        self.post(self.manager,{'action':'gf_import_commit','batch':preview['batch'],'owner_id':self.b})
        self.assertIn(lid,[l['id'] for l in self.state(self.ana)['leads']])
        self.assertNotIn(lid,[l['id'] for l in self.state(self.bia)['leads']])

    def test_import_rolls_back_contacts_and_assignments_together(self):
        preview=self.post(self.manager,{'action':'gf_import_preview','csv':'Nome;Telefone\nNovo Um;81999990014\nNovo Dois;81999990015'}).json()
        original=TeamStore.insert_profile
        def fail_second(store,row):
            if row['name']=='Novo Dois': raise ValueError('Falha controlada')
            return original(store,row)
        with patch.object(TeamStore,'insert_profile',fail_second):
            r=self.post(self.manager,{'action':'gf_import_commit','batch':preview['batch'],'owner_id':self.a})
        self.assertEqual(r.status_code,400)
        self.assertNotIn('Novo Um',[l['name'] for l in self.state(self.manager)['leads']])
        result=self.post(self.manager,{'action':'gf_import_commit','batch':preview['batch'],'owner_id':self.a}).json()
        self.assertEqual(result['created'],2)
        self.assertTrue(set(result['ids']).issubset({l['id'] for l in self.state(self.ana)['leads']}))

    def test_whatsapp_events_do_not_move_the_manual_pipeline(self):
        store=TeamStore(main.DB);store.event(self.la,'sent','real');store.event(self.la,'qualified','real');store.db.close()
        self.assertEqual(self.state(self.ana)['team']['stages'][str(self.la)],'new')
        self.post(self.ana,{'action':'team_move','id':self.la,'stage':'qualified'})
        self.post(self.ana,{'action':'gf_outcome','id':self.la,'outcome':'open','reason':'Conversa em andamento'})
        self.assertEqual(self.state(self.ana)['team']['stages'][str(self.la)],'qualified')

    def test_legacy_stage_is_preserved_once_on_migration(self):
        store=TeamStore(main.DB)
        store.event(self.la,'sent','real')
        with store.db:
            store.db.execute("DELETE FROM team_migrations WHERE name='manual_pipeline_1_5'")
            store.db.execute('DELETE FROM team_stages WHERE lead_id=?',(self.la,))
        store.db.close()
        self.assertEqual(self.state(self.ana)['team']['stages'][str(self.la)],'contacted')
        store=TeamStore(main.DB);store.event(self.la,'qualified','real');store.db.close()
        self.assertEqual(self.state(self.ana)['team']['stages'][str(self.la)],'contacted')

    def test_manual_qualification_counts_once_and_stays_scoped(self):
        for lid,client in [(self.la,self.ana),(self.lb,self.bia)]:
            self.post(client,{'action':'team_move','id':lid,'stage':'qualified'})
            self.post(client,{'action':'team_move','id':lid,'stage':'qualified'})
        report=self.post(self.ana,{'action':'gf_metrics','start':'2000-01-01','end':'2100-01-01'}).json()
        self.assertEqual(report['counts']['qualified'],1)
        self.assertEqual(report['approached'],0)
        self.assertEqual(self.state(self.ana)['meetings'],[])

    def test_seller_can_book_and_cancel_only_owned_lead_with_permission(self):
        store=TeamStore(main.DB);slot=store.slots(store.config(),self.la)[0];store.db.close()
        self.assertEqual(self.post(self.bia,{'action':'gf_book','id':self.la,'start':slot}).status_code,403)
        r=self.post(self.ana,{'action':'gf_book','id':self.la,'start':slot})
        self.assertEqual(r.status_code,200,r.text)
        meeting=next(m for m in self.state(self.ana)['meetings'] if m['lead_id']==self.la)
        self.assertEqual(self.state(self.bia)['meetings'],[])
        self.assertEqual(self.post(self.bia,{'action':'cancel','id':self.la,'meeting':meeting['id']}).status_code,403)
        self.assertEqual(self.post(self.ana,{'action':'cancel','id':self.la,'meeting':meeting['id']}).status_code,200)
        self.post(self.manager,{'action':'team_user_update','user_id':self.a,'permissions':[],'active':True})
        self.ana.post('/api/auth/login',json={'username':'ana','password':'Changed.Password.2030'},headers=self.headers)
        self.assertEqual(self.post(self.ana,{'action':'gf_book','id':self.la,'start':slot}).status_code,403)

    def test_only_manager_can_configure_application_google_credentials(self):
        for action in ('gf_google_config',):
            self.assertEqual(self.post(self.ana,{'action':action,'kind':'google'}).status_code,403)

    def test_seller_sees_only_google_availability_flag(self):
        with patch.dict(main.RUNTIME.values,{'GF_GOOGLE_CLIENT_ID':'PUBLIC_ID','GF_GOOGLE_CLIENT_SECRET':'PRIVATE_SECRET','GF_GOOGLE_REFRESH_TOKEN':'PRIVATE_REFRESH'},clear=True):
            result=self.state(self.ana)
            self.assertEqual(result['commercial']['connections']['configured'],{'google':False})
            self.assertEqual(result['commercial']['connections']['values'],{})
            self.assertNotIn('PRIVATE_SECRET',json.dumps(result))
            self.assertNotIn('PRIVATE_REFRESH',json.dumps(result))

    def test_calendar_visual_actions_enforce_owner_and_save_locally(self):
        store=TeamStore(main.DB);slot=store.slots(store.config(),self.la)[0];store.db.close()
        self.assertEqual(self.post(self.bia,{'action':'gf_calendar_save','id':self.la,'start':slot,'sync':False}).status_code,403)
        self.assertEqual(self.post(self.ana,{'action':'gf_calendar_save','id':self.la,'start':slot,'sync':True}).status_code,400)
        r=self.post(self.ana,{'action':'gf_calendar_save','id':self.la,'start':slot,'sync':False})
        self.assertEqual(r.status_code,200,r.text)
        meeting=next(m for m in self.state(self.ana)['meetings'] if m['lead_id']==self.la)
        r=self.ana.get('/api/calendar',params={'start':slot[:10]+'T00:00:00','end':slot[:10]+'T23:59:59'},headers=self.headers)
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()['events'][0]['lead_id'],self.la)
        self.assertEqual(self.post(self.ana,{'action':'gf_calendar_cancel','id':self.la,'meeting':meeting['id'],'sync':False}).status_code,200)
        r=self.bia.get('/api/calendar',params={'start':slot[:10]+'T00:00:00','end':slot[:10]+'T23:59:59'},headers=self.headers)
        self.assertEqual(r.json()['events'],[])
        self.assertEqual(self.ana.get('/api/calendar',params={'start':'x','end':'y'},headers=self.headers).status_code,400)

if __name__=='__main__': unittest.main()
