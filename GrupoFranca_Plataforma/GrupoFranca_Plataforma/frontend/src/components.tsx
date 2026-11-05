import {useEffect,useRef,type ReactNode} from 'react';
import {ArrowUpRight,Plus,Search,X,Inbox,LoaderCircle} from 'lucide-react';
import type {Lead,State} from './types';
import {initials} from './api';
export function Button({children,onClick,variant='',disabled=false,type='button',title}:{children:ReactNode;onClick?:()=>void;variant?:string;disabled?:boolean;type?:'button'|'submit';title?:string}){return <button title={title} type={type} className={'btn '+variant} onClick={onClick} disabled={disabled}>{children}</button>}
export function Header({title,description,children}:{title:string;description:string;children?:ReactNode}){return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{children}</div></div>}
export function NewButton({onClick}:{onClick:()=>void}){return <Button variant="primary" onClick={onClick}><Plus size={17}/>Novo contato</Button>}
export function Empty({title,description,children}:{title:string;description:string;children?:ReactNode}){return <div className="empty"><div className="empty-icon"><Inbox size={24}/></div><h3>{title}</h3><p>{description}</p>{children}</div>}
export function SearchBox({value,onChange,placeholder='Buscar contato ou empresa…'}:{value:string;onChange:(v:string)=>void;placeholder?:string}){return <label className="search"><Search size={17}/><input aria-label={placeholder} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
export function Phase({lead,state}:{lead:Lead;state:State}){return <span className={'status '+(lead.blocked?'red':lead.paused?'amber':lead.phase==='booked'?'green':lead.phase==='opening'?'neutral':'blue')}><i/>{lead.blocked?'Não contatar':lead.paused?'Pausado':state.phases[lead.phase]||lead.phase}</span>}
export function Avatar({name,color=''}:{name:string;color?:string}){return <span className={'avatar '+color}>{initials(name)}</span>}
export function MiniTable({leads,state,open}:{leads:Lead[];state:State;open:(id:number)=>void}){return leads.length?<div className="table-wrap"><table><thead><tr><th>Contato / empresa</th><th>Etapa</th><th></th></tr></thead><tbody>{leads.map(l=><tr key={l.id}><td><div className="person"><Avatar name={l.company||l.name}/><div><b>{l.company||l.name}</b><small>{l.name||l.contact||'Contato cadastrado'}</small></div></div></td><td><Phase lead={l} state={state}/></td><td><Button variant="icon" title="Abrir contato" onClick={()=>open(l.id)}><ArrowUpRight size={17}/></Button></td></tr>)}</tbody></table></div>:<Empty title="Seu próximo cliente começa aqui" description="Cadastre um contato e acompanhe cada oportunidade."/>}
export function Modal({title,description,children,close,busy=false}:{title:string;description?:string;children:ReactNode;close:()=>void;busy?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close()},[]);
 return <dialog ref={ref} onCancel={e=>{e.preventDefault();if(!busy)close()}} onClick={e=>{if(e.target===ref.current&&!busy)close()}}><div className="modal-head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div><Button variant="icon" title="Fechar" disabled={busy} onClick={close}><X size={20}/></Button></div>{children}</dialog>
}
export function Loading(){return <div className="loading"><LoaderCircle className="spin"/><span>Carregando…</span></div>}
