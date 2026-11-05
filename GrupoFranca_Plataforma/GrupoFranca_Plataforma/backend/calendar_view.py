"""Calendar projection: CRM meetings retain details; unrelated events remain private."""
from datetime import datetime, timedelta
import re
import urllib.parse
from .core import TZ

def local_time(part):
    value=part.get('dateTime',part.get('date',''))
    dt=datetime.fromisoformat(value.replace('Z','+00:00'))
    return dt.astimezone(TZ).replace(tzinfo=None) if dt.tzinfo else dt


def events(store, user, start, end):
    try:
        lower, upper = datetime.fromisoformat(start), datetime.fromisoformat(end)
        if lower.tzinfo or upper.tzinfo or not timedelta(0)<upper-lower<=timedelta(days=42): raise ValueError()
    except (ValueError,TypeError):
        raise ValueError('Informe um período de até 42 dias, no horário de Brasília.') from None
    visible=store.visible_ids(user)
    # Include past/local-cancelled links: Google may still have the original event pending cancellation.
    records=store.db.execute('''SELECT m.*,l.name,l.company,l.contact,l.need,l.blocked,c.status,c.error,c.attendee,
        c.event_id,c.operation,c.calendar_id,c.google_user_id,p.goal,p.email
        FROM meetings m JOIN leads l ON l.id=m.lead_id LEFT JOIN gf_calendar c ON c.meeting_id=m.id
        LEFT JOIN gf_profiles p ON p.lead_id=l.id
        WHERE c.google_user_id=? OR (c.google_user_id IS NULL AND ?='manager') ORDER BY m.start''',(user['id'],user['role'])).fetchall()
    calendar=store.credentials.get('GF_GOOGLE_CALENDAR_ID','primary')
    local=[dict(r) for r in records if r['lead_id'] in visible and (not r['calendar_id'] or r['calendar_id'] in ('primary',calendar))]
    def project(r,a=None,b=None,remote=False,editable=True):
        status=r['status'] or 'local'
        if remote and not r['active']:
            status='cancel_pending' if r['operation']=='cancel' and status in ('pending','error') else 'remote_only'
        return dict(id='meeting-'+str(r['id']),meeting_id=r['id'],lead_id=r['lead_id'],title=r['company'] or r['name'],
                    contact_name=r['name'],company=r['company'],contact=r['contact'],need=r['need'] or '',goal=r['goal'] or '',email=r['email'] or '',
                    start=a or r['start'],end=b or r['end'],kind='meeting',status=status,error=r['error'] or '',attendee=r['attendee'] or '',
                    blocked=bool(r['blocked']),editable=bool(editable and r['active']),pending_cancel=status=='cancel_pending',linked=editable)
    output=[project(r) for r in local if r['active'] and r['start']<upper.isoformat() and r['end']>lower.isoformat()]
    known={r['event_id']:r for r in local if r['event_id'] and r['status']!='local_test'}
    by_meeting={r['id']:r for r in local if r['event_id'] and r['status']!='local_test'}
    installation=store.db.execute("SELECT value FROM gf_system WHERE key='installation'").fetchone()[0]
    error=''; connected=store.credentials.ready('google')
    if connected:
        try:
            remote=[];replacements={};page='';seen=set()
            for _ in range(20):
                query=dict(singleEvents='true',timeMin=lower.replace(tzinfo=TZ).isoformat(),timeMax=upper.replace(tzinfo=TZ).isoformat(),maxResults=2500,
                           fields='items(id,status,transparency,start,end,description,extendedProperties/private),nextPageToken')
                if page:query['pageToken']=page
                result=store.calendar().request('/events?'+urllib.parse.urlencode(query))
                for event in result.get('items',[]):
                    if event.get('status')=='cancelled':continue
                    r=known.get(event.get('id'));exact=bool(r)
                    if not r:
                        # Legacy aliases are recognized only with installation proof AND an existing permitted local meeting.
                        private=event.get('extendedProperties',{}).get('private',{})
                        if private.get('gf_installation')==installation:
                            mid=str(private.get('gf_meeting_id',''))
                            if not mid:
                                match=re.fullmatch(r'Conversa comercial com o Grupo França\. Referência local: (\d+)',event.get('description','').strip())
                                mid=match[1] if match else ''
                            if mid.isdigit():r=by_meeting.get(int(mid))
                            if r and private.get('gf_lead_id') and str(r['lead_id'])!=str(private['gf_lead_id']):r=None
                    if not r and event.get('transparency')=='transparent':continue
                    a,b=local_time(event['start']),local_time(event['end'])
                    if b<=a:raise ValueError()
                    if r:
                        item=project(r,a.isoformat(),b.isoformat(),remote=True,editable=exact)
                        if exact:
                            seen.add(event['id'])
                            replacements[item['id']]=item
                        else:
                            item['id']='alias-'+str(len(remote));item['status']='link_review';remote.append(item)
                    else:
                        remote.append(dict(id='busy-'+str(len(remote)),title='Ocupado',start=a.isoformat(),end=b.isoformat(),kind='busy',all_day='date' in event['start']))
                    if len(remote)+len(replacements)>5000:raise ValueError()
                page=result.get('nextPageToken','')
                if not page:break
            else:raise ValueError()
            # Synchronized events are shown at their actual Google time; stale local copies aren't duplicated.
            output=[item for item in output if item['id'] not in replacements and item['status']!='synced']
            output.extend(replacements.values());output.extend(remote)
        except (ValueError,KeyError,TypeError):
            error='Não foi possível consultar os horários ocupados no Google. Atualize ou reconecte a agenda antes de reservar.'
    return dict(events=output,connected=connected,error=error,timezone='America/Sao_Paulo')
