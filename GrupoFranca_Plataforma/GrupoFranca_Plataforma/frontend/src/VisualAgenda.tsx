import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Plus,RefreshCw,Settings2,CalendarDays,Clock3,LockKeyhole} from 'lucide-react';
import {api} from './api';
import {Button,Modal} from './components';
import {CalendarConnection} from './CalendarConnection';
import {can,type State,type Action} from './types';
import './calendar.css';
export type CalendarEvent={id:string;title:string;start:string;end:string;kind:'meeting'|'busy';meeting_id?:number;lead_id?:number;status?:string;error?:string;attendee?:string;blocked?:boolean;all_day?:boolean;contact_name?:string;company?:string;contact?:string;need?:string;goal?:string;email?:string;editable?:boolean;pending_cancel?:boolean;linked?:boolean};
type Feed={events:CalendarEvent[];connected:boolean;error:string};
type View='day'|'week'|'month';
const labels:Record<string,string>={synced:'Sincronizado',pending:'Pendente de sincronização',error:'Erro na sincronização',local_test:'Reserva de teste',local:'Reserva local',cancel_pending:'Cancelamento pendente no Google',remote_only:'Evento no Google · reserva local encerrada',link_review:'Reunião identificada · vínculo a conferir'};
const weekdays=['DOM.','SEG.','TER.','QUA.','QUI.','SEX.','SÁB.'];
const pad=(n:number)=>String(n).padStart(2,'0');
const day=(value:string)=>new Date(value.slice(0,10)+'T12:00:00Z');
const key=(d:Date)=>d.toISOString().slice(0,10);
export const addDays=(value:string,amount:number)=>{const d=day(value);d.setUTCDate(d.getUTCDate()+amount);return key(d)};
export function calendarRange(anchor:string,view:View){
 let start=anchor;
 if(view==='week')start=addDays(anchor,-day(anchor).getUTCDay());
 if(view==='month'){const first=anchor.slice(0,7)+'-01';start=addDays(first,-day(first).getUTCDay())}
 const count=view==='month'?42:view==='week'?7:1;
 return {start,end:addDays(start,count),days:Array.from({length:count},(_,i)=>addDays(start,i))};
}
const time=(v:string)=>v.slice(11,16);
const pretty=(v:string)=>day(v).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
export function segments(events:CalendarEvent[],date:string){
 const start=date+'T00:00:00',end=addDays(date,1)+'T00:00:00';
 return events.filter(e=>!e.all_day&&e.start<end&&e.end>start).map(e=>{
  const minute=(v:string)=>Number(v.slice(11,13))*60+Number(v.slice(14,16));
  return {event:e,from:e.start<start?0:minute(e.start),to:e.end>=end?1440:minute(e.end),lane:0,lanes:1};
 }).sort((a,b)=>a.from-b.from||b.to-a.to);
}
export function positioned(events:CalendarEvent[],date:string){
 const list=segments(events,date);let group:typeof list=[],ends:number[]=[],maxEnd=-1;
 const flush=()=>{for(const item of group)item.lanes=ends.length;group=[];ends=[];maxEnd=-1};
 for(const item of list){
  if(item.from>=maxEnd)flush();
  let lane=ends.findIndex(end=>end<=item.from);if(lane<0)lane=ends.length;
  ends[lane]=item.to;item.lane=lane;group.push(item);maxEnd=Math.max(maxEnd,item.to);
 }
 flush();return list;
}
export function VisualAgenda({state,act,busy,notify,open}:{state:State;act:Action;busy:boolean;notify?:(text:string,error?:boolean)=>void;open:(id:number)=>void;confirm?:(text:string,data:Record<string,unknown>)=>void}){
 const today=state.now?.slice(0,10)||new Date().toISOString().slice(0,10);
 const [anchor,setAnchor]=useState(today),[view,setView]=useState<View>('week'),[feed,setFeed]=useState<Feed>({events:[],connected:false,error:''}),[loading,setLoading]=useState(false),[reload,setReload]=useState(0),[settings,setSettings]=useState(false),[drawer,setDrawer]=useState<CalendarEvent|null>(null),[editing,setEditing]=useState(false),[lead,setLead]=useState(''),[start,setStart]=useState(''),[attendee,setAttendee]=useState(''),[confirming,setConfirming]=useState<'save'|'cancel'|'sync'|null>(null),[working,setWorking]=useState(false),[error,setError]=useState('');
 const range=calendarRange(anchor,view),scroller=useRef<HTMLDivElement>(null),request=useRef(0),allowed=can(state,'book');
 const extra=(state as State&{commercial?:{profiles?:Record<string,{email?:string}>;calendar?:{status:string;operation:string;google_user_id?:number}[];connections?:{configured?:{google?:boolean}}}}).commercial;
 const connected=!!extra?.connections?.configured?.google;
 const pending=(extra?.calendar||[]).filter(e=>(e.google_user_id===undefined||e.google_user_id===state.user?.id)&&['pending','error'].includes(e.status)).length;
 useEffect(()=>{
  const seq=++request.current;let live=true;
  if(!allowed)return;
  setLoading(true);setFeed({events:[],connected,error:''});
  api<Feed>('/api/calendar?'+new URLSearchParams({start:range.start+'T00:00:00',end:range.end+'T00:00:00'})).then(value=>{if(live&&seq===request.current)setFeed(value)}).catch(()=>{if(live&&seq===request.current)setFeed({events:[],connected,error:'Não foi possível carregar a agenda. Tente atualizar.'})}).finally(()=>{if(live&&seq===request.current)setLoading(false)});
  return()=>{live=false};
 },[range.start,range.end,reload,connected,allowed]);
 useEffect(()=>{if(scroller.current&&view!=='month')scroller.current.scrollTop=420},[view]);
 useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!working){setDrawer(null);setEditing(false)}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[working]);
 function navigate(amount:number){
  if(view==='month'){const d=day(anchor.slice(0,7)+'-01');d.setUTCMonth(d.getUTCMonth()+amount);setAnchor(key(d))}
  else setAnchor(addDays(anchor,amount*(view==='week'?7:1)));
 }
 function create(date:string,hour=9,minute=0){
  if(!allowed||loading||feed.error||working||busy)return;
  setLead('');setStart(date+'T'+pad(hour)+':'+pad(minute));setAttendee('');setDrawer(null);setEditing(true);setError('');setConfirming(null);
 }
 function show(event:CalendarEvent){setDrawer(event);setEditing(false);setError('');setConfirming(null)}
 function edit(event:CalendarEvent){setLead(String(event.lead_id||''));setStart(event.start.slice(0,16));setAttendee(event.attendee||'');setEditing(true);setError('');setConfirming(null)}
 async function reconcile(){
  setWorking(true);try{const result=connected?await act({action:'gf_calendar_read'}):{updated:0,errors:[]};if(result){const errors=result.errors as string[];notify?.(errors?.length?errors.join(' '):'Agenda atualizada.',!!errors?.length)}setReload(x=>x+1)}finally{setWorking(false)}
 }
 async function commit(){
  setWorking(true);setError('');
  try{
   const action=confirming==='sync'?{action:'gf_sync'}:confirming==='cancel'?{action:'gf_calendar_cancel',id:drawer?.lead_id,meeting:drawer?.meeting_id,sync:connected}:{action:'gf_calendar_save',id:Number(lead),start,attendee,sync:connected};
   const result=await act(action);
   if(!result){setError('A operação não foi concluída. Confira a mensagem da plataforma e tente novamente.');return}
   const errors=(result.errors||[]) as string[];
   setConfirming(null);setDrawer(null);setEditing(false);setReload(x=>x+1);
   notify?.(errors.length?'Alteração salva na plataforma; o Google ficou pendente. '+errors.join(' '):confirming==='cancel'?'Reunião cancelada.':confirming==='sync'?'Sincronização concluída.':connected?'Reunião salva e sincronizada com o Google.':'Reserva salva na agenda interna.',!!errors.length);
  }finally{setWorking(false)}
 }
 const displayTitle=view==='day'?pretty(anchor):day(anchor.slice(0,7)+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
 const mini=calendarRange(anchor,'month');
 const halt=busy||working;
 return <div className="calendar-page">
  <header className="calendar-heading"><div><CalendarDays size={25}/><h1>Agenda</h1></div><div className="calendar-actions"><span className={'calendar-connection-dot '+(connected?'connected':'')}>{connected?'Google conectado':'Agenda interna'}</span><Button variant="icon" title="Conexão com Google" onClick={()=>setSettings(!settings)}><Settings2 size={18}/></Button></div></header>
  {settings&&<CalendarConnection state={state} act={act} busy={halt} notify={notify}/>}
  {!allowed?<p>Seu perfil não tem permissão para acessar a agenda. Solicite ao gerente.</p>:<>
  <div className="calendar-toolbar"><div className="calendar-actions"><Button variant="primary" disabled={halt||loading||!!feed.error} onClick={()=>create(anchor)}><Plus size={17}/>Criar reunião</Button><Button onClick={()=>setAnchor(today)}>Hoje</Button><Button variant="icon" title="Período anterior" onClick={()=>navigate(-1)}><ChevronLeft size={19}/></Button><Button variant="icon" title="Próximo período" onClick={()=>navigate(1)}><ChevronRight size={19}/></Button><h2>{displayTitle}</h2></div><div className="calendar-actions"><Button variant="icon" title="Atualizar agenda" disabled={halt} onClick={reconcile}><RefreshCw size={17} className={loading||working?'spin':''}/></Button><select aria-label="Visualização da agenda" value={view} onChange={e=>setView(e.target.value as View)}><option value="day">Dia</option><option value="week">Semana</option><option value="month">Mês</option></select>{pending>0&&<Button disabled={halt} onClick={()=>setConfirming('sync')}>Sincronizar pendências ({pending})</Button>}</div></div>
  {!connected&&<div className="calendar-notice">Conecte o Google em <button onClick={()=>setSettings(true)}>Configurações da agenda</button> para consultar compromissos e enviar convites.</div>}
  {feed.error&&<div role="alert" className="calendar-notice error">{feed.error}</div>}
  <div className="calendar-layout" aria-busy={loading}>
   <aside className="calendar-sidebar"><b>{day(anchor).toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})}</b><div className="mini-calendar">{weekdays.map(w=><span key={w}>{w[0]}</span>)}{mini.days.map(d=><button key={d} className={(d===anchor?'chosen ':'')+(d===today?'today ':'')+(d.slice(0,7)!==anchor.slice(0,7)?'muted':'')} onClick={()=>setAnchor(d)} aria-label={pretty(d)}>{Number(d.slice(8))}</button>)}</div><div className="calendar-legend"><span><i/>Reuniões comerciais</span><span><i className="busy"/>Ocupado no Google</span><small>Horário de Brasília · GMT−3</small></div></aside>
   <section className="calendar-surface" aria-label="Calendário comercial">
    {loading&&<div role="status" className="calendar-loading">Carregando agenda…</div>}
    {view==='month'?<div className="calendar-month"><div className="calendar-month-weekdays">{weekdays.map(w=><span key={w}>{w}</span>)}</div><div className="calendar-month-grid">{range.days.map(d=>{const events=feed.events.filter(e=>e.start<addDays(d,1)+'T00:00:00'&&e.end>d+'T00:00:00');return <div key={d} className={'calendar-month-cell '+(d.slice(0,7)!==anchor.slice(0,7)?'outside':'')}><button className={'calendar-date '+(d===today?'today':'')} aria-label={'Abrir dia '+pretty(d)} onClick={()=>{setAnchor(d);setView('day')}}>{Number(d.slice(8))}</button><button className="calendar-month-create" aria-label={'Criar reunião em '+pretty(d)} disabled={halt||loading||!!feed.error} onClick={()=>create(d)}>+</button>{events.slice(0,3).map(e=><button key={e.id} className={'calendar-month-event '+e.kind} onClick={()=>show(e)}>{!e.all_day&&<span>{e.start.slice(0,10)===d?time(e.start):'↳'}</span>}{e.title}</button>)}{events.length>3&&<button className="calendar-more" onClick={()=>{setAnchor(d);setView('day')}}>Mais {events.length-3}</button>}</div>})}</div></div>:<>
     <div className="calendar-days-heading" style={{gridTemplateColumns:`58px repeat(${range.days.length},minmax(0,1fr))`}}><small>GMT−3</small>{range.days.map(d=><button key={d} className={d===today?'current':''} onClick={()=>{setAnchor(d);setView('day')}}><span>{weekdays[day(d).getUTCDay()]}</span><b className={d===today?'today':''}>{Number(d.slice(8))}</b></button>)}</div>
     <div className="calendar-allday" style={{gridTemplateColumns:`58px repeat(${range.days.length},minmax(0,1fr))`}}><small>Dia todo</small>{range.days.map(d=><div key={d}>{feed.events.filter(e=>e.all_day&&e.start<addDays(d,1)+'T00:00:00'&&e.end>d+'T00:00:00').map(e=><button key={e.id} onClick={()=>show(e)}>{e.title}</button>)}</div>)}</div>
     <div className="calendar-time-scroll" ref={scroller}><div className="calendar-time-grid" style={{gridTemplateColumns:`58px repeat(${range.days.length},minmax(0,1fr))`}}><div className="calendar-hours">{Array.from({length:24},(_,h)=><span key={h} style={{top:h*60}}>{pad(h)}:00</span>)}</div>{range.days.map(d=><div key={d} className="calendar-day-column">{Array.from({length:48},(_,i)=><button key={i} className={'calendar-slot '+(i%2?'half':'')} style={{top:i*30}} disabled={halt||loading||!!feed.error} aria-label={'Agendar '+pretty(d)+' às '+pad(Math.floor(i/2))+':'+(i%2?'30':'00')} onClick={()=>create(d,Math.floor(i/2),i%2?30:0)}/>)}{positioned(feed.events,d).map(({event,from,to,lane,lanes})=><button key={event.id} className={'calendar-event '+event.kind+' '+(event.status==='pending'?'pending':'')} style={{top:from,height:Math.max(to-from,22),left:`calc(${lane/lanes*100}% + 3px)`,width:`calc(${100/lanes}% - 6px)`}} onClick={()=>show(event)} title={event.title+' · '+time(event.start)+'–'+time(event.end)}><strong>{event.title}</strong><span>{time(event.start)} – {time(event.end)}</span></button>)}{d===today&&<div className="calendar-now" style={{top:Number(state.now.slice(11,13))*60+Number(state.now.slice(14,16))}}><i/></div>}</div>)}</div></div>
    </>}
   </section>
  </div>
  </>}
  {(drawer||editing)&&<Modal title={editing?(drawer?'Reagendar reunião':'Nova reunião'):drawer?.title||'Reunião'} close={()=>{setDrawer(null);setEditing(false);setConfirming(null)}} busy={halt}><div className="calendar-form">
   {editing?<form onSubmit={e=>{e.preventDefault();setConfirming('save')}}><label>Contato<select required disabled={halt||!!drawer} value={lead} onChange={e=>{setLead(e.target.value);setAttendee(extra?.profiles?.[e.target.value]?.email||'');setConfirming(null)}}><option value="">Selecione o contato</option>{state.leads.filter(l=>!l.blocked||String(l.id)===lead).map(l=><option key={l.id} value={l.id}>{l.company||l.name}</option>)}</select></label><label>Data e hora (Brasília)<input required type="datetime-local" step={1800} value={start} disabled={halt} onChange={e=>{setStart(e.target.value);setConfirming(null)}}/></label><label>E-mail do convidado (opcional)<input type="email" value={attendee} disabled={halt} onChange={e=>{setAttendee(e.target.value);setConfirming(null)}}/></label><small>Reunião de 30 minutos. Horários e conflitos serão verificados antes de salvar.</small>{confirming!=='save'&&<Button type="submit" variant="primary" disabled={halt||!lead||!start}>Revisar reunião</Button>}</form>:drawer&&<><p className="calendar-detail-time"><Clock3 size={18}/>{pretty(drawer.start)}<br/>{drawer.all_day?'Dia todo':time(drawer.start)+' – '+time(drawer.end)}</p>{drawer.kind==='busy'?<p><LockKeyhole size={16}/> Compromisso ocupado na sua agenda Google. Os detalhes pessoais não são exibidos na plataforma.</p>:<><span className="status neutral">{labels[drawer.status||'local']||drawer.status}</span><dl className="calendar-contact-info">{drawer.contact_name&&<><dt>Nome do contato</dt><dd>{drawer.contact_name}</dd></>}{drawer.company&&<><dt>Empresa</dt><dd>{drawer.company}</dd></>}{drawer.contact&&<><dt>Telefone / contato</dt><dd>{drawer.contact}</dd></>}{drawer.email&&<><dt>E-mail do contato</dt><dd>{drawer.email}</dd></>}{drawer.attendee&&<><dt>Destinatário do convite</dt><dd>{drawer.attendee}</dd></>}{drawer.need&&<><dt>Necessidade relatada</dt><dd>{drawer.need}</dd></>}{drawer.goal&&<><dt>Objetivo comercial</dt><dd>{drawer.goal}</dd></>}</dl>{drawer.editable===false&&<p>{drawer.pending_cancel?'O cancelamento está salvo na plataforma, mas ainda precisa ser enviado ao Google. Use Sincronizar pendências.':drawer.linked===false?'O evento foi identificado como uma reunião do Grupo França, mas seu identificador mudou. Abra a ficha do contato para conferir o vínculo antes de alterar a reserva.':'A reserva local está encerrada. Confira o histórico e atualize a agenda antes de alterar este evento.'}</p>}{drawer.error&&<p role="alert" className="gf-error">{drawer.error}</p>}<div className="gf-actions"><Button disabled={halt||!allowed||drawer.blocked||drawer.editable===false} onClick={()=>edit(drawer)}>Reagendar</Button><Button disabled={halt||!allowed||drawer.editable===false} onClick={()=>setConfirming('cancel')}>Cancelar reserva</Button><Button onClick={()=>{if(drawer.lead_id)open(drawer.lead_id)}}>Abrir contato</Button></div></>}</>}
   {confirming&&confirming!=='sync'&&<div className="calendar-review"><b>{confirming==='cancel'?'Cancelar esta reunião?':'Confirmar reunião?'}</b><p>{confirming==='save'?pretty(start)+' · '+time(start)+' · 30 minutos':''}</p><p>{connected?(confirming==='cancel'?'O cancelamento será enviado ao Google e aos convidados.':'A reserva será sincronizada com o Google. Se houver convidado, ele receberá o convite.'):'A alteração será salva somente na agenda interna.'}</p><div className="gf-actions"><Button disabled={halt} onClick={()=>setConfirming(null)}>Voltar</Button><Button variant="primary" disabled={halt||!allowed||(confirming==='save'&&!state.leads.some(l=>l.id===Number(lead)&&!l.blocked))} onClick={commit}>{confirming==='cancel'?'Confirmar cancelamento':connected?'Salvar e sincronizar':'Salvar reserva'}</Button></div></div>}
   {error&&<p className="gf-error" role="alert">{error}</p>}
  </div></Modal>}
  {confirming==='sync'&&<Modal title="Sincronizar pendências" close={()=>setConfirming(null)} busy={halt}><p>Enviar as alterações pendentes da sua agenda ao Google? Os convidados receberão os convites e cancelamentos correspondentes.</p><Button disabled={halt} variant="primary" onClick={commit}>Confirmar sincronização</Button>{error&&<p role="alert">{error}</p>}</Modal>}
 </div>;
}
