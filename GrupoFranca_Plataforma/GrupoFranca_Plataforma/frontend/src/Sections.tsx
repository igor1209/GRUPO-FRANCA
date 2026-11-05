import {useState,type FormEvent} from 'react';
import {Save} from 'lucide-react';
import {Button,Empty,Header} from './components';
import {FrancaAI} from './Platform';
import {date} from './api';
import {can,type State,type Lead,type Action} from './types';

export function whatsappLink(value:string){
  if(value.includes('@'))return '';
  let number=value.replace(/\D/g,'');
  if(!value.trim().startsWith('+')&&[10,11].includes(number.length))number='55'+number;
  return /^[1-9]\d{9,14}$/.test(number)?'https://wa.me/'+number:'';
}
export {WhatsAppIntegration as WhatsAppPage} from './WhatsApp';
export function CallsHistory(){return <><Header title="Ligações individuais" description="Histórico de ligações."/><section className="card work-pad"><Empty title="Nenhuma ligação registrada" description="O app ainda não possui integração de telefonia. Nenhuma ligação será simulada neste histórico."/></section></>;}
export function CadenceHistory({state,open}:{state:State;open:(id:number)=>void}){
  const labels:Record<string,string>={active:'Em andamento',done:'Concluída',cancelled:'Cancelada'};
  return <><Header title="Histórico de cadências" description="Acompanhamento dos fluxos."/><section className="card work-pad">{state.workspace.runs.length?<div className="table-wrap"><table><thead><tr><th>Contato</th><th>Fluxo</th><th>Etapa atual</th><th>Prazo da etapa</th><th>Status</th></tr></thead><tbody>{state.workspace.runs.map(r=><tr key={r.id}><td><Button variant="text" onClick={()=>open(r.lead_id)}>{state.leads.find(l=>l.id===r.lead_id)?.name||'Abrir contato'}</Button></td><td>{state.workspace.cadences.find(c=>c.id===r.cadence_id)?.name||'Fluxo'}</td><td>{r.status==='done'?'Finalizada':r.step+1}</td><td>{date(r.due)}</td><td>{labels[r.status]||r.status}</td></tr>)}</tbody></table></div>:<Empty title="Nenhuma cadência registrada" description="As execuções dos fluxos aparecerão aqui."/>}</section></>;
}
export function Returns({state,open}:{state:State;open:(id:number)=>void}){
  const rows=state.leads.filter(l=>l.followup&&!l.blocked).sort((a,b)=>a.followup.localeCompare(b.followup));
  return <><Header title="Retornos" description="Acompanhamentos programados."/><section className="card work-pad">{rows.map(l=><div className="channel-contact" key={l.id}><span><b>{l.name||l.company}</b><small>{date(l.followup)} · {l.followup<=state.now?'Pendente':'Programado'}</small></span><Button onClick={()=>open(l.id)}>Ver ficha</Button></div>)}{!rows.length&&<Empty title="Nenhum retorno programado" description="Programe o próximo contato na ficha do lead."/>}</section></>;
}
export function ContactNotes({lead,act,busy}:{lead:Lead;act:Action;busy:boolean}){
  const [notes,setNotes]=useState(lead.notes),[followup,setFollowup]=useState(lead.followup.slice(0,16));
  async function save(e:FormEvent){e.preventDefault();await act({action:'notes',id:lead.id,notes,followup});}
  return <form onSubmit={save}><label>Notas internas<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={20000} rows={4}/></label><label>Próximo retorno<input type="datetime-local" disabled={Boolean(lead.blocked)} value={followup} onChange={e=>setFollowup(e.target.value)}/></label><div className="modal-actions"><Button type="submit" disabled={busy} variant="primary"><Save size={15}/>Salvar ficha</Button></div></form>;
}
export function AgentSettings({state,act,busy}:{state:State;act:Action;busy:boolean}){
  return <><Header title="Assistente" description="Agente padrão do Grupo França."/><section className="card work-pad"><h2>França IA · Aquisição de clientes</h2><p>Apresentação, diagnóstico da necessidade, qualificação e encaminhamento para reunião com Igor.</p><form onSubmit={async e=>{e.preventDefault();await act({action:'config',...Object.fromEntries(new FormData(e.currentTarget))});}}><div className="form-grid">{[['outbound','Apresentação'],['inbound','Recepção'],['question','Pergunta de qualificação'],['invite','Convite para reunião']].map(([key,label])=><label key={key}>{label}<textarea name={key} defaultValue={String(state.config[key as keyof typeof state.config])} required maxLength={10000} rows={3}/></label>)}<label>Início do atendimento<input type="number" name="start" min={0} max={23} defaultValue={state.config.start}/></label><label>Fim do atendimento<input type="number" name="end" min={1} max={24} defaultValue={state.config.end}/></label></div><div className="modal-actions"><Button type="submit" variant="primary" disabled={busy}>Salvar assistente</Button></div></form></section><details className="card work-pad advanced-agent"><summary>Conhecimento e treinamento</summary><FrancaAI state={state} act={act} busy={busy}/></details></>;
}
