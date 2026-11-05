import {useEffect,useRef,useState} from 'react';
import {Plus,QrCode,RefreshCw,Save,Send,ExternalLink} from 'lucide-react';
import {Button,Empty,Header,Modal} from './components';
import {api,date} from './api';
import {can,type State} from './types';
import './whatsapp.css';

type Kind='confirmation'|'scheduling'|'qualification'|'return';
type Connection={id:string;name:string;owner_id:number;owner_name:string;status:string;number:string;error:string;qr?:string;qr_expires:number;templates:Record<Kind,string>;sends:{id:string;lead_id:number;kind:Kind;purpose:string;status:string;ack:number;error:string;created:string}[]};
type Preview={phone:string;text:string;digest:string};
const kinds:Record<Kind,string>={confirmation:'Confirmação',scheduling:'Agendamento',qualification:'Qualificação',return:'Retorno'};
const statuses:Record<string,string>={disconnected:'Desconectado',starting:'Iniciando…',qr:'Aguardando leitura',authenticated:'Autenticado · carregando…',connected:'Conectado',error:'Falha na conexão',auth_failure:'Autenticação não concluída'};
const variables=['nome_contato','empresa','empresa_contato','agente'];
export function WhatsAppIntegration({state}:{state:State}){
 const manager=state.user?.role==='manager';
 const [connections,setConnections]=useState<Connection[]>([]),[selected,setSelected]=useState(''),[tab,setTab]=useState('connection');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [adding,setAdding]=useState(false),[name,setName]=useState(''),[owner,setOwner]=useState(String(state.user?.id||''));
 const [kind,setKind]=useState<Kind>('confirmation'),[body,setBody]=useState(''),[leadId,setLeadId]=useState(''),[purpose,setPurpose]=useState('test');
 const [preview,setPreview]=useState<Preview|null>(null),[requestId,setRequestId]=useState('');
 const editor=useRef<HTMLTextAreaElement>(null),alive=useRef(true),busyRef=useRef(false),selectedRef=useRef('');
 const connection=connections.find(c=>c.id===selected);
 const available=state.leads.filter(l=>!l.blocked&&(!connection||state.team?.users.find(u=>u.id===connection.owner_id)?.role==='manager'||state.team?.assignments[String(l.id)]===connection.owner_id));
 async function load(){
  const result=await api<{connections:Connection[];error:string}>('/api/whatsapp');
  if(!alive.current)return;
  setConnections(result.connections||[]);setLoaded(true);
  if(!selectedRef.current&&result.connections?.[0]){selectedRef.current=result.connections[0].id;setSelected(result.connections[0].id);}
  if(result.error)setError(result.error);
 }
 useEffect(()=>{
  alive.current=true;let timer:ReturnType<typeof setTimeout>;
  async function poll(){try{if(!busyRef.current)await load();}catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)timer=setTimeout(poll,3000);}}
  void poll();return()=>{alive.current=false;clearTimeout(timer)};
 },[]);
 useEffect(()=>{setBody(connection?.templates[kind]||'');setPreview(null);setLeadId('');},[selected,kind]);
 // The initial response may arrive after selecting a connection; preserve unsaved edits on polls.
 useEffect(()=>{if(connection&&!body)setBody(connection.templates[kind]||'');},[connection?.id]);
 async function action(op:string,data:Record<string,unknown>={}){
  if(busyRef.current)return;
  setError('');setNotice('');setBusy(true);busyRef.current=true;
  try{const result=await api<Record<string,unknown>>('/api/whatsapp/'+op,{connection:selected,...data});await load();return result;}
  catch(e){setError((e as Error).message);return undefined;}
  finally{setBusy(false);busyRef.current=false;}
 }
 function pick(id:string){selectedRef.current=id;setSelected(id);setNotice('');setError('');setTab('connection');}
 async function create(){const r=await action('create',{name,owner_id:Number(owner)});if(r?.id){pick(String(r.id));setAdding(false);setName('');}}
 function insert(variable:string){const area=editor.current;const start=area?.selectionStart??body.length,end=area?.selectionEnd??start;const token='{{'+variable+'}}';setBody(body.slice(0,start)+token+body.slice(end));requestAnimationFrame(()=>{area?.focus();area?.setSelectionRange(start+token.length,start+token.length)});}
 async function prepare(){const r=await action('preview',{kind,lead_id:Number(leadId)});if(r){setPreview(r as unknown as Preview);setRequestId(crypto.randomUUID().replaceAll('-',''));}}
 async function send(){if(!preview)return;const r=await action('send',{kind,lead_id:Number(leadId),purpose,confirmed:true,digest:preview.digest,request_id:requestId});if(r){setPreview(null);setNotice(r.status==='sent'?'Mensagem enviada ao WhatsApp. A entrega será atualizada quando houver confirmação.':String(r.error||'Envio ainda sem confirmação. Confira no WhatsApp antes de repetir.'));}}
 return <><Header title="WhatsApp" description="Conexões e mensagens do Grupo França.">{manager&&<Button variant="primary" onClick={()=>setAdding(true)}><Plus size={16}/>Adicionar conexão</Button>}</Header>
  {error&&<p role="alert" className="wa-error">{error}</p>}{notice&&<p role="status" className="wa-notice">{notice}</p>}
  <div className="wa-layout"><aside className="card wa-list"><small>CONEXÕES ({connections.length})</small>{connections.map(c=><button key={c.id} className={'wa-connection '+(selected===c.id?'selected':'')} onClick={()=>pick(c.id)}><b>{c.name}</b><small><i className={c.status==='connected'?'online':''}/>{c.number?'+'+c.number:statuses[c.status]||c.status}</small><small>{c.owner_name}</small></button>)}</aside>
   <section className="card work-pad wa-main">{connection?<><div className="work-title"><div><h2>{connection.name}</h2><small>{connection.owner_name}</small></div><span className={'status '+(connection.status==='connected'?'green':'neutral')}>{statuses[connection.status]||connection.status}</span></div>
    <div className="wa-tabs"><Button variant={tab==='connection'?'primary':''} onClick={()=>setTab('connection')}>Conexão</Button><Button variant={tab==='messages'?'primary':''} onClick={()=>setTab('messages')}>Mensagens</Button><Button variant={tab==='assistant'?'primary':''} onClick={()=>setTab('assistant')}>Assistente</Button></div>
    {tab==='connection'&&<><div className="wa-qr-panel">
     {connection.status==='connected'?<><span className="wa-connected">✓</span><h3>WhatsApp conectado</h3><p>+{connection.number}</p><a className="btn" href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">Abrir WhatsApp Web <ExternalLink size={15}/></a></>:<>{manager&&connection.qr&&connection.qr_expires>Date.now()?<img className="wa-qr" src={connection.qr} alt={'QR Code para conectar '+connection.name}/>:<QrCode size={60}/>}<h3>{statuses[connection.status]||'Conectar WhatsApp'}</h3><p>{manager?'No celular, abra WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo.':'Solicite ao gerente a conexão deste número.'}</p></>}
     {connection.error&&<p role="alert" className="wa-error">{connection.error}</p>}
    </div>{manager&&<div className="gf-actions"><Button variant="primary" disabled={busy||['starting','authenticated','qr','connected'].includes(connection.status)} onClick={()=>void action('connect')}><RefreshCw size={15}/>Conectar / gerar QR Code</Button>{connection.status!=='disconnected'&&<Button disabled={busy||['starting','authenticated'].includes(connection.status)} onClick={()=>{if(window.confirm('Desconectar este número e encerrar o vínculo com o CRM?'))void action('disconnect')}}>Desconectar</Button>}</div>}
    {manager&&<label className="wa-owner">Responsável pela conexão<select value={connection.owner_id} disabled={busy} onChange={e=>void action('assign',{owner_id:Number(e.target.value)})}>{state.team?.users.filter(u=>u.active).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label>}
    <small className="wa-help">As conversas continuam no WhatsApp. Esta conexão não importa o conteúdo das conversas para o painel.</small></>}
    {tab==='messages'&&<><div className="wa-kind-tabs">{(Object.keys(kinds) as Kind[]).map(k=><Button key={k} variant={kind===k?'primary':''} onClick={()=>setKind(k)}>{kinds[k]}</Button>)}</div>
     <label>Mensagem de {kinds[kind].toLowerCase()}<textarea ref={editor} value={body} readOnly={!manager} maxLength={4000} rows={6} onChange={e=>setBody(e.target.value)}/></label>
     {manager&&<><div className="wa-variables">{variables.map(v=><button key={v} onClick={()=>insert(v)}>{'{{'+v+'}}'}</button>)}</div><Button disabled={busy||!body.trim()} onClick={async()=>{const r=await action('template',{kind,body});if(r)setNotice('Modelo salvo.')}}><Save size={15}/>Salvar mensagem</Button></>}
     <div className="wa-test"><h3>Enviar mensagem</h3><p>Os dados vêm do contato cadastrado. Salve o modelo antes de gerar a prévia.</p><label>Contato<select value={leadId} onChange={e=>setLeadId(e.target.value)}><option value="">Selecione um contato</option>{available.map(l=><option value={l.id} key={l.id}>{l.name||l.company} · {l.contact}</option>)}</select></label><label>Finalidade<select value={purpose} onChange={e=>setPurpose(e.target.value)}><option value="test">Teste · não contabilizar como abordagem</option><option value="operational">Atendimento · registrar abordagem</option></select></label><Button disabled={busy||!leadId||connection.status!=='connected'||!can(state,'message')||body!==connection.templates[kind]} variant="primary" onClick={()=>void prepare()}><Send size={15}/>Revisar envio</Button></div>
     {!!connection.sends.length&&<details className="wa-log"><summary>Últimos envios</summary>{connection.sends.map(s=><div key={s.id}><b>{state.leads.find(l=>l.id===s.lead_id)?.name||'Contato'} · {kinds[s.kind]}</b><small>{date(s.created)} · {s.purpose==='test'?'Teste':'Atendimento'} · {s.status==='sent'?(s.ack<0?'Falha informada pelo WhatsApp':s.ack>=3?'Lida':s.ack>=2?'Entregue':s.ack>=1?'Recebida pelo servidor':'Enviada · aguardando confirmação'):s.status==='unknown'?'Sem confirmação · confira no WhatsApp':s.status==='failed'?'Não enviada':'Em envio'}</small>{s.error&&<small>{s.error}</small>}</div>)}</details>}
    </>}
    {tab==='assistant'&&<><h3>França IA · Aquisição de clientes</h3><p>O agente segue o padrão definido pelo Grupo França. O conector já permite enviar os modelos configurados.</p><p>Respostas automáticas da IA e gatilhos após ligações ainda não estão ligados a este canal. Nenhuma conversa será respondida automaticamente nesta versão.</p></>}
   </>:<Empty title={loaded?'Nenhuma conexão disponível':'Carregando conexões…'} description={manager?'Adicione uma conexão e escaneie o QR Code no celular.':'O gerente precisa vincular uma conexão à sua conta.'}/>}</section>
  </div>
  {adding&&<Modal title="Adicionar conexão" close={()=>setAdding(false)} busy={busy}><form onSubmit={e=>{e.preventDefault();void create()}}><label>Nome da conexão<input value={name} onChange={e=>setName(e.target.value)} placeholder="Comercial · Recife" maxLength={60} required/></label><label>Responsável<select value={owner} onChange={e=>setOwner(e.target.value)}>{state.team?.users.filter(u=>u.active).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label><div className="modal-actions"><Button type="submit" variant="primary" disabled={busy}>Criar conexão</Button></div></form></Modal>}
  {preview&&<Modal title="Revisar mensagem" description="Este envio é real e chegará ao WhatsApp do contato." busy={busy} close={()=>setPreview(null)}><p><b>Destino:</b> +{preview.phone}</p><p><b>Finalidade:</b> {purpose==='test'?'Teste':'Atendimento'}</p><div className="wa-preview">{preview.text}</div><div className="modal-actions"><Button disabled={busy} onClick={()=>setPreview(null)}>Cancelar</Button><Button variant="primary" disabled={busy} onClick={()=>void send()}>{busy?'Enviando…':'Confirmar e enviar'}</Button></div></Modal>}
 </>;
}
