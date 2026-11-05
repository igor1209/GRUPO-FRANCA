import json
import unittest
from unittest.mock import patch
from backend import calendar_view
from backend import google_accounts as ga
from backend.tests import test_google_accounts as helpers

class CalendarViewTests(unittest.TestCase):
    setUp=helpers.GoogleAccountsTests.setUp
    tearDown=helpers.GoogleAccountsTests.tearDown
    rebind=helpers.GoogleAccountsTests.rebind
    start=helpers.GoogleAccountsTests.start
    finish=helpers.GoogleAccountsTests.finish
    def test_privacy_pagination_timezone_all_day_and_duplicate_filter(self):
        self.finish(self.start());self.rebind()
        a=self.store.create('Lead A','Empresa A','a@example.test')
        with patch.object(self.store,'validate_slot'):
            self.store.reserve(a,'2030-11-04T09:00:00',self.store.config(),source='real')
        self.store.assign(a,self.uid)
        with self.store.db:self.store.db.execute("UPDATE gf_calendar SET status='synced'")
        own=self.store.db.execute('SELECT event_id FROM gf_calendar').fetchone()[0]
        pages=[{'nextPageToken':'page2','items':[{'id':own,'start':{'dateTime':'2030-11-04T09:00:00-03:00'},'end':{'dateTime':'2030-11-04T09:30:00-03:00'}},{'id':'personal','summary':'SECRET_MEDICAL','description':'PRIVATE','attendees':[{'email':'private@example.test'}],'start':{'dateTime':'2030-11-04T15:00:00Z'},'end':{'dateTime':'2030-11-04T16:00:00Z'}}]}, {'items':[{'id':'holiday','start':{'date':'2030-11-05'},'end':{'date':'2030-11-06'}},{'id':'cancelled','status':'cancelled'},{'id':'free','transparency':'transparent'}]}]
        with patch.object(self.store,'calendar') as cal:
            cal.return_value.request.side_effect=pages
            result=calendar_view.events(self.store,self.user,'2030-11-03T00:00:00','2030-11-10T00:00:00')
            self.assertIn('pageToken=page2',cal.return_value.request.call_args_list[1][0][0])
            self.assertIn('fields=',cal.return_value.request.call_args_list[0][0][0])
        self.assertEqual(len(result['events']),3)
        self.assertEqual(result['events'][1]['start'],'2030-11-04T12:00:00')
        self.assertTrue(result['events'][2]['all_day'])
        for secret in ('SECRET_MEDICAL','PRIVATE','private@example.test','personal',own):self.assertNotIn(secret,json.dumps(result))
    def test_external_failure_returns_no_partial_busy_data_and_honest_warning(self):
        self.finish(self.start());self.rebind()
        with patch.object(self.store,'calendar') as cal:
            cal.return_value.request.side_effect=ValueError('network')
            result=calendar_view.events(self.store,self.user,'2030-11-03T00:00:00','2030-11-10T00:00:00')
        self.assertTrue(result['error']);self.assertEqual(result['events'],[])
    def test_range_is_bounded_and_rejects_aware_times(self):
        for a,b in [('2030-11-03','2031-11-03'),('x','y'),('2030-11-03','2030-11-03'),('2030-11-03T00:00:00Z','2030-11-04T00:00:00Z')]:
            with self.assertRaises(ValueError):calendar_view.events(self.store,self.user,a,b)
    def test_local_meetings_only_from_own_calendar_and_portfolio(self):
        a=self.store.create('Mine','Mine','mine@example.test');b=self.store.create('Other','Other','other@example.test')
        self.store.assign(a,self.uid);self.store.assign(b,self.manager)
        self.store.reserve(a,'2030-11-04T09:00:00',self.store.config(),source='real')
        ga.bind(self.store,self.store.public_user(self.store.db.execute('SELECT * FROM team_users WHERE id=?',(self.manager,)).fetchone()))
        self.store.reserve(b,'2030-11-04T09:00:00',self.store.config(),source='real')
        self.rebind();result=calendar_view.events(self.store,self.user,'2030-11-03','2030-11-10')
        self.assertEqual([e['lead_id'] for e in result['events']],[a]);self.assertNotIn('Other',json.dumps(result))

    def test_sync_filtered_to_selected_lead_does_not_send_other_pending_invites(self):
        a=self.store.create('A','A','a@example.test');b=self.store.create('B','B','b@example.test')
        self.store.reserve(a,'2030-11-04T09:00:00',self.store.config(),source='real')
        self.store.reserve(b,'2030-11-04T10:00:00',self.store.config(),source='real')
        self.finish(self.start());self.rebind()
        with patch.object(self.store,'validate_slot'),patch.object(self.store,'calendar') as cal:
            cal.return_value.sync.return_value={}
            result=self.store.sync_calendar(lead_id=a)
            self.assertEqual(result['synced'],1)
            self.assertEqual(cal.return_value.sync.call_count,1)
            self.assertEqual(cal.return_value.sync.call_args[0][1]['id'],a)
        self.assertEqual(self.store.db.execute('SELECT status FROM gf_calendar c JOIN meetings m ON m.id=c.meeting_id WHERE m.lead_id=?',(b,)).fetchone()[0],'pending')

    def test_cancelled_meeting_remains_visible_as_pending_sync(self):
        from backend.team import scoped_state
        a=self.store.create('A','A','a@example.test');self.store.assign(a,self.uid)
        self.store.reserve(a,'2030-11-04T09:00:00',self.store.config(),source='real')
        self.store.cancel_meetings(a)
        state=scoped_state(self.store,self.user)
        self.assertEqual(state['meetings'],[])
        self.assertEqual(state['commercial']['calendar'][0]['operation'],'cancel')
        self.assertEqual(state['commercial']['calendar'][0]['status'],'pending')

    def google_ready(self):
        self.finish(self.start());self.rebind()
    def meeting(self,status='synced',active=True):
        a=self.store.create('Eduardo Vieira Silva','Empresa Eduardo','5581999998396')
        self.store.assign(a,self.uid)
        with patch.object(self.store,'validate_slot'):
            self.store.reserve(a,'2030-11-04T10:00:00',self.store.config(),source='real',attendee='eduardo@example.test')
        with self.store.db:
            self.store.db.execute('UPDATE gf_calendar SET status=?',(status,))
            self.store.db.execute('UPDATE meetings SET active=?',(int(active),))
        return dict(self.store.db.execute('SELECT * FROM gf_calendar').fetchone())
    def render_remote(self,entry):
        with patch.object(self.store,'calendar') as cal:
            cal.return_value.request.return_value={'items':[entry]}
            return calendar_view.events(self.store,self.user,'2030-11-03','2030-11-10')['events']
    def remote(self,event_id):
        return {'id':event_id,'start':{'dateTime':'2030-11-04T10:00:00-03:00'},'end':{'dateTime':'2030-11-04T10:30:00-03:00'}}
    def test_original_meeting_pending_or_error_has_details_and_no_busy_duplicate(self):
        self.google_ready();row=self.meeting(status='error')
        events=self.render_remote(self.remote(row['event_id']))
        self.assertEqual(len(events),1);self.assertEqual(events[0]['kind'],'meeting')
        self.assertEqual(events[0]['contact_name'],'Eduardo Vieira Silva')
        self.assertEqual(events[0]['contact'],'5581999998396');self.assertEqual(events[0]['attendee'],'eduardo@example.test')
        self.assertTrue(events[0]['editable'])
    def test_locally_cancelled_google_event_preserves_details_and_pending_status(self):
        self.google_ready();row=self.meeting(status='pending',active=False)
        with self.store.db:self.store.db.execute("UPDATE gf_calendar SET operation='cancel'")
        event=self.render_remote(self.remote(row['event_id']))[0]
        self.assertEqual(event['kind'],'meeting');self.assertEqual(event['contact_name'],'Eduardo Vieira Silva')
        self.assertEqual(event['status'],'cancel_pending');self.assertFalse(event['editable'])
    def test_google_moved_event_uses_actual_time_without_duplicate(self):
        self.google_ready();row=self.meeting()
        with self.store.db:self.store.db.execute("UPDATE meetings SET start='2030-12-01T09:00:00',end='2030-12-01T09:30:00'")
        events=self.render_remote(self.remote(row['event_id']))
        self.assertEqual(len(events),1);self.assertEqual(events[0]['start'],'2030-11-04T10:00:00')
    def test_legacy_alias_requires_installation_and_permitted_local_reference(self):
        self.google_ready();row=self.meeting()
        installation=self.store.db.execute("SELECT value FROM gf_system WHERE key='installation'").fetchone()[0]
        remote=self.remote('different-event-id');remote.update(description='Conversa comercial com o Grupo França. Referência local: '+str(row['meeting_id']),extendedProperties={'private':{'gf_installation':installation}})
        result=self.render_remote(remote)
        self.assertEqual(len(result),1);self.assertEqual(result[0]['kind'],'meeting');self.assertEqual(result[0]['contact_name'],'Eduardo Vieira Silva');self.assertFalse(result[0]['editable'])
        remote['extendedProperties']['private']['gf_installation']='different-installation'
        result=self.render_remote(remote);self.assertEqual(result[0]['kind'],'busy');self.assertNotIn('Eduardo',json.dumps(result))
    def test_known_meeting_from_another_user_never_reveals_details(self):
        self.google_ready();row=self.meeting()
        with self.store.db:self.store.db.execute('UPDATE gf_calendar SET google_user_id=?',(self.manager,))
        result=self.render_remote(self.remote(row['event_id']))
        self.assertEqual(result[0]['kind'],'busy');self.assertNotIn('Eduardo',json.dumps(result))
