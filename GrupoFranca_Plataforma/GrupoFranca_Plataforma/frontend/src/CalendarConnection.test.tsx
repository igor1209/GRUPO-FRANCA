// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {CalendarConnection} from './CalendarConnection';
import {Agenda} from './Platform';
import type {State} from './types';
afterEach(cleanup);
function fixture(role:'manager'|'seller'='manager',permissions:string[]=[]):State{
 return {user:{id:1,role,name:'Igor',permissions},leads:[{id:1,name:'Ana',company:'Empresa',blocked:0}],meetings:[{id:1,lead_id:1,start:'2030-11-04T10:00:00',end:'2030-11-04T10:30:00',name:'Ana',company:'Empresa'}],workspace:{},now:'2030-11-01T09:00:00',commercial:{profiles:{},calendar:[],connections:{configured:{google:false},google_app_ready:true,values:{},checked:{}}}} as unknown as State;
}
it('seller sees connect button but never app credentials',()=>{
 render(<CalendarConnection state={fixture('seller',['book'])} act={vi.fn()} busy={false}/>);
 expect(screen.getByRole('button',{name:'Conectar Google Agenda'})).toBeTruthy();
 expect(screen.queryByLabelText('Client secret Google')).toBeNull();
 expect(screen.queryByText('Integração do aplicativo · administrador')).toBeNull();
});
it('administrator setup saves only app credentials and clears secret',async()=>{
 const act=vi.fn(async()=>({ok:true}));render(<CalendarConnection state={fixture()} act={act} busy={false}/>);
 fireEvent.change(screen.getByLabelText('Client ID Google'),{target:{value:'example.apps.googleusercontent.com'}});
 const secret=screen.getByLabelText('Client secret Google') as HTMLInputElement;
 expect(secret.type).toBe('password');fireEvent.change(secret,{target:{value:'PRIVATE'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar integração do aplicativo',hidden:true}));
 await waitFor(()=>expect(act).toHaveBeenCalledWith({action:'gf_google_config',GF_GOOGLE_CLIENT_ID:'example.apps.googleusercontent.com',GF_GOOGLE_CLIENT_SECRET:'PRIVATE'}));
 expect(secret.value).toBe('');
});
it('does not navigate to a returned non-Google authorization URL',async()=>{
 const act=vi.fn(async()=>({url:'https://attacker.invalid/'}));render(<CalendarConnection state={fixture('seller',['book'])} act={act} busy={false}/>);
 fireEvent.click(screen.getByRole('button',{name:'Conectar Google Agenda'}));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Não foi possível'));
 expect(act).toHaveBeenCalledWith({action:'gf_google_authorize'});
});
it('seller without booking permission cannot reschedule, cancel or connect',()=>{
 render(<Agenda state={fixture('seller')} act={vi.fn()} busy={false} open={vi.fn()} confirm={vi.fn()}/>);
 expect(screen.getByText('Seu perfil não tem permissão para acessar a agenda. Solicite ao gerente.')).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Criar reunião'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Conectar Google Agenda'})).toBeNull();
});
