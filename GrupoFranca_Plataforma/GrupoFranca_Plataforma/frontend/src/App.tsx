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
