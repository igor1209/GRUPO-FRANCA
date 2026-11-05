import hashlib
import json
from pathlib import Path
import tempfile
import time
import unittest
from urllib.parse import parse_qs,urlparse
from unittest.mock import patch
from backend import google_accounts as ga
from backend.team import TeamStore, authorize, AccessError, scoped_state
from backend.connectors import Credentials

class GoogleAccountsTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/'test.sqlite3'
        self.store=TeamStore(self.path);self.manager=self.store.setup('Password.Manager.2030')
        self.uid=self.store.manage_user(self.store.public_user(self.store.db.execute('SELECT * FROM team_users WHERE id=?',(self.manager,)).fetchone()),dict(action='team_user_create',name='Ana',username='ana',password='Password.Seller.2030',permissions=['book']))['id']
        with self.store.db:self.store.db.execute('UPDATE team_users SET must_change=0 WHERE id=?',(self.uid,))
        self.cookie=self.store.session(self.uid);self.user=self.store.current_user(self.cookie)
        self.vault=ga.bind(self.store,self.user)
        self.vault.configure({'GF_GOOGLE_CLIENT_ID':'app-id','GF_GOOGLE_CLIENT_SECRET':'app-secret'})
        self.rebind()
    def rebind(self):
        self.store.credentials=Credentials();ga.bind(self.store,self.user)
    def tearDown(self):
        self.store.db.close();self.tmp.cleanup()
    def start(self):return parse_qs(urlparse(self.vault.begin(self.user,self.cookie)).query)
    def finish(self,q,calendar='ana@example.test',scopes=None):
        result={'refresh_token':'PRIVATE_REFRESH','access_token':'PRIVATE_ACCESS','scope':' '.join(ga.SCOPES if scopes is None else scopes)}
        with patch.object(ga.connectors,'http_json',side_effect=[result,{'id':calendar}]):self.vault.finish('code',q['state'][0])
    def test_only_calendar_scopes_pkce_and_no_login_identity(self):
        q=self.start();self.assertEqual(set(q['scope'][0].split()),ga.SCOPES)
        self.assertNotIn('openid',q['scope'][0]);self.assertNotIn('email',q['scope'][0]);self.assertNotIn('profile',q['scope'][0]);self.assertEqual(q['code_challenge_method'],['S256'])
        self.assertEqual(q['redirect_uri'],[ga.REDIRECT])
    def test_encrypted_restart_and_isolation(self):
        self.finish(self.start());self.store.db.close();self.store=TeamStore(self.path);self.rebind()
        self.assertTrue(self.store.credentials.ready('google'))
        self.assertEqual(self.store.credentials.get('GF_GOOGLE_CALENDAR_ID'),'ana@example.test')
        raw=self.path.read_bytes();self.assertNotIn(b'PRIVATE_REFRESH',raw);self.assertNotIn(b'app-secret',raw)
        other=self.store.public_user(self.store.db.execute('SELECT * FROM team_users WHERE id=?',(self.manager,)).fetchone())
        ga.bind(self.store,other);self.assertFalse(self.store.credentials.ready('google'))
    def test_replay_and_wrong_state(self):
        q=self.start()
        with self.assertRaises(ValueError):self.vault.finish('code','unknown')
        self.finish(q)
        with self.assertRaises(ValueError):self.finish(q)
    def test_logout_and_expiry_block_callback_before_network(self):
        for mode in ('logout','expiry'):
            q=self.start()
            with self.store.db:
                if mode=='logout':self.store.db.execute('DELETE FROM team_sessions WHERE user_id=?',(self.uid,))
                else:self.store.db.execute('UPDATE google_states SET expires=0')
            with patch.object(ga.connectors,'http_json') as remote:
                with self.assertRaises(ValueError):self.vault.finish('code',q['state'][0])
                remote.assert_not_called()
            self.cookie=self.store.session(self.uid)
    def test_disabled_or_permission_removed_cannot_complete(self):
        q=self.start()
        with self.store.db:self.store.db.execute("UPDATE team_users SET permissions='[]' WHERE id=?",(self.uid,))
        with patch.object(ga.connectors,'http_json') as remote:
            with self.assertRaises(ValueError):self.vault.finish('code',q['state'][0])
            remote.assert_not_called()
    def test_partial_consent_does_not_store_grant(self):
        with self.assertRaises(ValueError):self.finish(self.start(),scopes={'https://www.googleapis.com/auth/calendar.readonly'})
        self.assertEqual(self.vault.read('user:'+str(self.uid)),{})
    def test_disconnect_preserves_other_user_app_and_key(self):
        self.finish(self.start());self.vault.write('user:'+str(self.manager),{'refresh':'manager-refresh','calendar':'manager@example.test'})
        self.vault.disconnect(self.uid);self.assertTrue(self.vault.read('user:'+str(self.manager)))
        self.assertEqual(self.vault.read('user:'+str(self.uid)),{});self.assertTrue(all(self.vault.app().values()))
    def test_missing_or_corrupt_key_never_replaced(self):
        original=self.vault.key_path.read_bytes();self.vault.key_path.unlink()
        with self.assertRaises(ValueError):self.vault.read('app')
        self.assertFalse(self.vault.key_path.exists());self.vault.key_path.write_bytes(original)
        self.assertTrue(self.vault.read('app'))
    def test_seller_allowlist_cannot_configure_app_or_mail(self):
        for action in ('gf_google_authorize','gf_google_forget','gf_sync','gf_calendar_read'):
            authorize(self.store,self.user,{'action':action})
        with self.assertRaises(AccessError):authorize(self.store,self.user,{'action':'gf_google_config'})
        with self.assertRaises(AccessError):authorize(self.store,self.user,{'action':'gf_connection_test','kind':'smtp'})
    def test_no_secrets_or_technical_fields_in_seller_state(self):
        self.finish(self.start());self.rebind();state=scoped_state(self.store,self.user)
        output=json.dumps(state)
        for secret in ('PRIVATE_REFRESH','PRIVATE_ACCESS','app-secret','app-id'):self.assertNotIn(secret,output)
        self.assertTrue(state['commercial']['connections']['configured']['google'])
        self.assertTrue(state['commercial']['connections']['google_app_ready'])
    def make_booking(self,uid,lid,start):
        user=self.store.public_user(self.store.db.execute('SELECT * FROM team_users WHERE id=?',(uid,)).fetchone())
        self.store.credentials=Credentials();ga.bind(self.store,user)
        self.store.reserve(lid,start,self.store.config(),source='real')
    def test_same_slot_independent_users_and_sync_does_not_cross(self):
        a=self.store.create('Cliente A','A','a@example.test');b=self.store.create('Cliente B','B','b@example.test')
        slot=self.store.slots(self.store.config(),a)[0]
        self.make_booking(self.uid,a,slot);self.make_booking(self.manager,b,slot)
        with self.assertRaises(ValueError):ga.guard_lead_calendar(self.store,a)
        self.vault.write('user:'+str(self.manager),{'refresh':'manager-refresh','calendar':'manager@example.test'})
        self.store.credentials=Credentials();ga.bind(self.store,self.store.public_user(self.store.db.execute('SELECT * FROM team_users WHERE id=?',(self.manager,)).fetchone()))
        with patch.object(self.store,'validate_slot'),patch.object(self.store,'calendar') as calendar:
            calendar.return_value.sync.return_value={'htmlLink':'https://calendar.google.com/test'}
            result=self.store.sync_calendar()
            self.assertEqual(result['synced'],1)
            self.assertEqual(calendar.return_value.sync.call_args[0][1]['id'],b)
        self.assertEqual(self.store.db.execute('SELECT status FROM gf_calendar c JOIN meetings m ON m.id=c.meeting_id WHERE m.lead_id=?',(a,)).fetchone()[0],'pending')
    def test_reconnect_other_account_rejected_for_existing_reservations(self):
        self.finish(self.start());self.rebind()
        a=self.store.create('A','A','a@example.test')
        with patch.object(self.store,'validate_slot'):
            slot=self.store.slots(self.store.config(),a)[0] if False else '2030-11-04T10:00:00'
            self.store.reserve(a,slot,self.store.config(),source='real')
        with self.assertRaises(ValueError):self.finish(self.start(),calendar='other@example.test')
        self.assertEqual(self.vault.read('user:'+str(self.uid))['calendar'],'ana@example.test')

if __name__=='__main__':unittest.main()

class GoogleHTTPTests(unittest.TestCase):
    def test_real_routes_persist_grant_and_keep_platform_session(self):
        from fastapi.testclient import TestClient
        from backend import main
        with tempfile.TemporaryDirectory() as folder,patch.object(main,'BASE',Path(folder)),patch.object(main,'DB',Path(folder)/'sdr.sqlite3'):
            with TestClient(main.app,base_url='http://127.0.0.1:8780') as client:
                headers={'X-SDR-Token':client.get('/api/session').json()['token']}
                client.post('/api/auth/setup',json={'password':'Password.Manager.2030'},headers=headers)
                cookie=client.cookies.get('gf_session')
                def action(payload):return client.post('/api/action',json=payload,headers=headers)
                self.assertEqual(action({'action':'gf_google_config','GF_GOOGLE_CLIENT_ID':'client','GF_GOOGLE_CLIENT_SECRET':'secret'}).status_code,200)
                url=action({'action':'gf_google_authorize'}).json()['url'];state=parse_qs(urlparse(url).query)['state'][0]
                with patch.object(ga.connectors,'http_json',side_effect=[{'refresh_token':'REFRESH','access_token':'ACCESS','scope':' '.join(ga.SCOPES)},{'id':'manager@example.test'}]):
                    callback=client.get('/oauth/google/callback',params={'state':state,'code':'test-code'})
                self.assertEqual(callback.status_code,200)
                self.assertEqual(callback.headers['cache-control'],'no-store')
                self.assertEqual(client.cookies.get('gf_session'),cookie)
                snapshot=client.get('/api/state',headers=headers).json()
                self.assertTrue(snapshot['commercial']['connections']['configured']['google'])
                self.assertNotIn('REFRESH',json.dumps(snapshot));self.assertNotIn('ACCESS',json.dumps(snapshot))
                self.assertEqual(action({'action':'gf_google_forget'}).status_code,200)
                self.assertFalse(client.get('/api/state',headers=headers).json()['commercial']['connections']['configured']['google'])
            # Restart keeps app configuration and backs up the encryption key alongside the DB.
            with TestClient(main.app,base_url='http://127.0.0.1:8780') as client:
                self.assertTrue(list((Path(folder)/'backups').glob('*.google.key')))
