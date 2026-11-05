// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach,beforeAll} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {VisualAgenda,calendarRange,positioned,type CalendarEvent} from './VisualAgenda';
import type {State} from './types';
beforeAll(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
const event:CalendarEvent={id:'one',title:'Empresa Ana',start:'2030-11-04T09:00:00',end:'2030-11-04T09:30:00',kind:'meeting',lead_id:1,meeting_id:1,status:'synced'};
const fixture=(connected=true)=>({now:'2030-11-04T08:00:00',user:{id:1,role:'seller',permissions:['book']},leads:[{id:1,name:'Ana',company:'Empresa Ana',blocked:0}],meetings:[],commercial:{profiles:{'1':{email:'ana@example.test'}},calendar:[],connections:{configured:{google:connected},google_app_ready:true}}}) as unknown as State;
function mount(events:CalendarEvent[]=[event],connected=true,error=''){
 const fetch=vi.fn(async()=>new Response(JSON.stringify({events,connected,error})));vi.stubGlobal('fetch',fetch);
 const act=vi.fn(async()=>({ok:true,errors:[],synced:1}));render(<VisualAgenda state={fixture(connected)} act={act} busy={false} open={vi.fn()}/>);return {act,fetch};
}
it('calculates week, leap month and six week month boundaries',()=>{
 expect(calendarRange('2030-11-04','week')).toMatchObject({start:'2030-11-03',end:'2030-11-10'});
 expect(calendarRange('2028-02-29','month').days).toContain('2028-02-29');expect(calendarRange('2030-12-31','month').days).toHaveLength(42);
});
it('overlapping events are assigned readable separate lanes',()=>{
 const list=positioned([event,{...event,id:'two',start:'2030-11-04T09:15:00',end:'2030-11-04T10:00:00'}],'2030-11-04');
 expect(list.map(e=>e.lane)).toEqual([0,1]);expect(list.map(e=>e.lanes)).toEqual([2,2]);
});
it('shows week then month and day without sending any invitation',async()=>{
 const {act}=mount();await screen.findByRole('button',{name:'Empresa Ana 09:00 – 09:30'});
 fireEvent.change(screen.getByLabelText('Visualização da agenda'),{target:{value:'month'}});expect(await screen.findByRole('button',{name:'Abrir dia 4 de novembro de 2030'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Abrir dia 4 de novembro de 2030'}));expect((screen.getByLabelText('Visualização da agenda') as HTMLSelectElement).value).toBe('day');expect(act).not.toHaveBeenCalled();
});
it('personal busy periods have no edit or cancel controls',async()=>{
 mount([{...event,id:'busy',kind:'busy',title:'Ocupado',lead_id:undefined}]);fireEvent.click(await screen.findByRole('button',{name:'Ocupado 09:00 – 09:30'}));
 expect(screen.getByText(/Os detalhes pessoais não são exibidos/)).toBeTruthy();expect(screen.queryByRole('button',{name:'Reagendar'})).toBeNull();expect(screen.queryByRole('button',{name:'Cancelar reserva'})).toBeNull();
});
it('requires review before creating and syncing a selected lead',async()=>{
 const {act}=mount([]);await waitFor(()=>expect((screen.getByRole('button',{name:'Criar reunião'}) as HTMLButtonElement).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:'Agendar 4 de novembro de 2030 às 09:00'}));fireEvent.change(screen.getByLabelText('Contato'),{target:{value:'1'}});
 fireEvent.click(screen.getByRole('button',{name:'Revisar reunião'}));expect(act).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Salvar e sincronizar'}));
 await waitFor(()=>expect(act).toHaveBeenCalledWith({action:'gf_calendar_save',id:1,start:'2030-11-04T09:00',attendee:'ana@example.test',sync:true}));
});
it('cancellation is confirmed and applies only to the selected meeting',async()=>{
 const {act}=mount();fireEvent.click(await screen.findByRole('button',{name:'Empresa Ana 09:00 – 09:30'}));fireEvent.click(screen.getByRole('button',{name:'Cancelar reserva'}));expect(act).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirmar cancelamento'}));
 await waitFor(()=>expect(act).toHaveBeenCalledWith({action:'gf_calendar_cancel',id:1,meeting:1,sync:true}));
});
it('a failed external availability read prevents new bookings',async()=>{
 mount([],true,'Google indisponível');await screen.findByText('Google indisponível');expect((screen.getByRole('button',{name:'Criar reunião'}) as HTMLButtonElement).disabled).toBe(true);
});
it('a disconnected calendar can save locally after explicit review',async()=>{
 const {act}=mount([],false);await waitFor(()=>expect((screen.getByRole('button',{name:'Criar reunião'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Criar reunião'}));fireEvent.change(screen.getByLabelText('Contato'),{target:{value:'1'}});fireEvent.click(screen.getByRole('button',{name:'Revisar reunião'}));fireEvent.click(screen.getByRole('button',{name:'Salvar reserva'}));await waitFor(()=>expect(act).toHaveBeenCalledWith(expect.objectContaining({sync:false})));
});

it('CRM meeting details include contact information instead of private busy notice',async()=>{
 mount([{...event,contact_name:'Eduardo Vieira Silva',company:'Empresa Eduardo',contact:'5581999998396',need:'Precisa organizar a aquisição de clientes.',goal:'Ampliar o comercial',attendee:'eduardo@example.test'}]);
 fireEvent.click(await screen.findByRole('button',{name:'Empresa Ana 09:00 – 09:30'}));
 expect(screen.getByText('Eduardo Vieira Silva')).toBeTruthy();expect(screen.getByText('5581999998396')).toBeTruthy();expect(screen.getByText('eduardo@example.test')).toBeTruthy();expect(screen.getByText('Ampliar o comercial')).toBeTruthy();expect(screen.getByRole('button',{name:'Reagendar'})).toBeTruthy();
 expect(screen.queryByText(/Os detalhes pessoais não são exibidos/)).toBeNull();
});
