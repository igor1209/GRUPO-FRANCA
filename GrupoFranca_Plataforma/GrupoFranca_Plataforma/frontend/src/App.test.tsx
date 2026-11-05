// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {render,screen,cleanup,waitFor,fireEvent,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import type {State,Lead} from './types';

beforeAll(()=>{
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
 HTMLElement.prototype.scrollIntoView=vi.fn();
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear()});
function setup(){
 const config={provider:'Regras (teste)',openai_model:'gpt-4.1-mini',local_model:'',local_url:'http://localhost:11434',daily_limit:40,start:9,end:18,outbound:'Olá',inbound:'Bem-vindo',question:'O que precisa?',invite:'Vamos conversar?',knowledge:'Base comercial'};
 const data:State={leads:[],meetings:[],phases:{opening:'Abordagem',need:'Entender relato',invite:'Convite',booked:'Reunião local',stopped:'Não contatar'},config,now:'2026-10-29T09:00:00',key_ready:false,workspace:{meta:{},history:[],cadences:[],runs:[],usage:[]}};
 data.user={id:1,name:'Igor França',username:'igor',role:'manager',permissions:[],active:1,target:0,must_change:0,created:data.now};
 data.team={users:[data.user],assignments:{},stages:{},stage_labels:{new:'Novos',contacted:'Contatados',qualified:'Qualificados',meeting:'Reunião',proposal:'Proposta',won:'Ganho',lost:'Perdido'},permission_labels:{create:'Cadastrar contatos'}};
 const calls:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>{
  let result:unknown=data;
  if(path==='/api/session')result={token:'test-token',setup_required:false,user:data.user};
  else if(path==='/api/action'){
   const body=JSON.parse(String(options?.body));calls.push(body);
   if(body.action==='gf_profile'){
    const lead:Lead={id:1,name:body.name,company:body.company,contact:body.contact,origin:body.origin,target:body.target,phase:'opening',need:'',notes:'',followup:'',paused:0,blocked:0,created:data.now,updated:data.now};data.leads.push(lead);result={id:1};
   }else if(body.action==='cadence_save'){data.workspace.cadences.push({id:1,name:body.name,steps:JSON.stringify(body.steps),created:data.now});result={ok:true}}
   else if(body.action==='team_management'){result={rows:[],audit:[],start:data.now,end:data.now}}
   else if(body.action==='gf_metrics'){result={counts:{},cohort:{},approached:0,daily:{},sources:[],failures:0}}
   else if(body.action==='config'){data.config={...config,...body};result={ok:true}}
   else result={ok:true};
  }else if(path.startsWith('/api/contact'))result={lead:data.leads[0],messages:[{id:1,lead_id:1,role:'assistant',text:'Olá, teste',created:data.now,provider:'Regras (teste)'}],summary:'Resumo comercial',meeting:null};
  return {ok:true,json:async()=>structuredClone(result)};
 }));
 return {data,calls};
}
it('opens every operational page with an empty real base',async()=>{
 setup();render(<App/>);await screen.findByRole('heading',{name:'Visão geral'});
 for(const [label,title] of [['Análise comercial','Análise comercial'],['Contatos','Contatos'],['Conversas','Conversas'],['Funil comercial','Funil comercial'],['Agenda','Agenda comercial'],['Histórico','Histórico de interações'],['E-mails','E-mails'],['Equipe','Equipe'],['Configurações','Configurações']]){
  await userEvent.click(screen.getByRole('navigation').querySelector('button')!); // stable return to the dashboard
  const nav=screen.getByRole('navigation');await userEvent.click(within(nav).getByRole('button',{name:label}));
  expect(screen.getByRole('heading',{name:title})).toBeTruthy();
 }
});
it('creates a contact and connects its conversation to the action API',async()=>{
 const {calls}=setup();render(<App/>);await screen.findByRole('heading',{name:'Visão geral'});
 await userEvent.click(screen.getByRole('button',{name:'Novo contato'}));
 await userEvent.type(screen.getByLabelText('Nome',{exact:true}),'Ana');await userEvent.type(screen.getByLabelText('Empresa',{exact:true}),'Empresa Teste');
 await userEvent.click(screen.getByRole('button',{name:'Salvar contato'}));
 await screen.findByText('Olá, teste');await userEvent.type(screen.getByRole('textbox',{name:'Mensagem'}),'Sim');
 await userEvent.click(screen.getByRole('button',{name:'Enviar mensagem'}));
 await waitFor(()=>expect(calls.some(c=>c.action==='send'&&c.text==='Sim'&&c.id===1)).toBe(true));
 expect(calls[0].action).toBe('gf_profile');
});
it('retains settings across tabs and uses a fixed dark theme',async()=>{
 const {calls}=setup();render(<App/>);await screen.findByRole('heading',{name:'Visão geral'});
 expect(document.documentElement.dataset.theme).toBe('dark');
 expect(screen.queryByRole('button',{name:'Ativar tema claro'})).toBeNull();
 expect(screen.queryByText('Workspace comercial')).toBeNull();
 await userEvent.click(within(screen.getByRole('navigation')).getByRole('button',{name:'Configurações'}));
 expect(screen.queryByLabelText('Motor de conversa')).toBeNull();
 fireEvent.change(screen.getByLabelText('Início do atendimento'),{target:{value:'8'}});
 await userEvent.click(screen.getByRole('button',{name:'Salvar agente'}));
 await waitFor(()=>expect(calls.some(c=>c.action==='config'&&c.start==='8')).toBe(true));
});
