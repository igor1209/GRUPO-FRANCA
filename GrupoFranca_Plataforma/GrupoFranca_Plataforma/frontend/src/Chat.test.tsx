// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {Inbox} from './Chat';
import type {State,Detail} from './types';

afterEach(cleanup);
beforeEach(()=>{HTMLElement.prototype.scrollIntoView=vi.fn(()=>{throw new Error('Page scroll is not allowed for chat messages')})});
function fixture(){
 const lead={id:1,name:'Ana',company:'Empresa',contact:'',origin:'Outbound',target:'B2B',phase:'need',need:'',notes:'',followup:'',paused:0,blocked:0,created:'2026-10-30T10:00:00',updated:'2026-10-30T10:00:00'};
 const detail:Detail={lead,meeting:null,summary:'Resumo',messages:[{id:1,lead_id:1,role:'assistant',text:'Primeira mensagem',created:lead.created,provider:'Regras'}]};
 const state={leads:[lead],phases:{need:'Entender relato'},now:lead.created,workspace:{meta:{},history:[],cadences:[],runs:[],usage:[]},meetings:[],config:{},key_ready:false} as unknown as State;
 return {state,detail};
}
function props(){return {open:vi.fn(),act:vi.fn(async()=>({ok:true})),busy:false,edit:vi.fn(),newContact:vi.fn(),notify:vi.fn(),confirm:vi.fn()}}
it('keeps the message panel mounted and follows new messages without scrolling page ancestors',()=>{
 const {state,detail}=fixture(),actions=props();
 const {rerender}=render(<Inbox {...actions} state={state} selected={1} detail={detail}/>);
 const box=screen.getByLabelText('Histórico da conversa');
 Object.defineProperties(box,{scrollHeight:{configurable:true,value:1200},clientHeight:{configurable:true,value:400}});
 const next={...detail,messages:[...detail.messages,{...detail.messages[0],id:2,text:'Nova resposta'}]};
 rerender(<Inbox {...actions} state={state} selected={1} detail={next}/>);
 expect(screen.getByLabelText('Histórico da conversa')).toBe(box);
 expect(box.scrollTop).toBe(1200);
 expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
 expect(document.documentElement.scrollTop).toBe(0);
});
it('preserves the position while reading old messages and provides an explicit return to latest',()=>{
 const {state,detail}=fixture(),actions=props();
 const {rerender}=render(<Inbox {...actions} state={state} selected={1} detail={detail}/>);
 const box=screen.getByLabelText('Histórico da conversa');
 Object.defineProperties(box,{scrollHeight:{configurable:true,value:1200},clientHeight:{configurable:true,value:400}});
 box.scrollTop=100;fireEvent.scroll(box);
 const next={...detail,messages:[...detail.messages,{...detail.messages[0],id:2,text:'Resposta durante a leitura'}]};
 rerender(<Inbox {...actions} state={state} selected={1} detail={next}/>);
 expect(box.scrollTop).toBe(100);
 fireEvent.click(screen.getByRole('button',{name:'Últimas mensagens'}));
 expect(box.scrollTop).toBe(1200);
 expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
});
it('does not discard unsaved notes when an incoming message updates the lead',()=>{
 const {state,detail}=fixture(),actions=props();
 const {rerender}=render(<Inbox {...actions} state={state} selected={1} detail={detail}/>);
 fireEvent.change(screen.getByLabelText('NOTAS INTERNAS'),{target:{value:'Nota ainda não salva'}});
 rerender(<Inbox {...actions} state={state} selected={1} detail={{...detail,lead:{...detail.lead,updated:'2026-10-30T10:01:00'}}}/>);
 expect((screen.getByRole('textbox',{name:/NOTAS INTERNAS/}) as HTMLTextAreaElement).value).toBe('Nota ainda não salva');
});
