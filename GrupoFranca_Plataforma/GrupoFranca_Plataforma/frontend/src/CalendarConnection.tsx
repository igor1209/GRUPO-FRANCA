import {useState,type FormEvent} from 'react';
import {Button} from './components';
import type {Action,State} from './types';
type Connection={configured:Record<string,boolean>;google_app_ready?:boolean};
export function CalendarConnection({state,act,busy,notify}:{state:State;act:Action;busy:boolean;notify?:(text:string,error?:boolean)=>void}){
 const connection=(state as State&{commercial?:{connections:Connection}}).commercial?.connections;
 const [client,setClient]=useState(''),[secret,setSecret]=useState(''),[error,setError]=useState(''),[disconnect,setDisconnect]=useState(false);
 const manager=state.user?.role==='manager',allowed=manager||!!state.user?.permissions.includes('book');
 if(!allowed)return null;
 async function connect(){
  setError('');
  const result=await act({action:'gf_google_authorize'});
  const value=String(result?.url||'');
  if(value.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')){
   // Top-level navigation avoids popup blockers and never uses Google as platform login.
   window.location.assign(value);
  }else setError('Não foi possível iniciar a conexão. Confira a mensagem da plataforma.');
 }
 async function configure(e:FormEvent){
  e.preventDefault();setError('');
  if(await act({action:'gf_google_config',GF_GOOGLE_CLIENT_ID:client,GF_GOOGLE_CLIENT_SECRET:secret})){
   setSecret('');setClient('');notify?.('Integração preparada. Cada usuário pode conectar sua própria agenda.');
  }
 }
 const configured=connection?.configured.google,ready=connection?.google_app_ready;
 return <section className="card gf-pad"><div className="work-title"><h2>Google Agenda</h2><span className={'status '+(configured?'green':'neutral')}>{configured?'Agenda conectada':'Agenda não conectada'}</span></div>
  <p>Conecte sua agenda para consultar horários e organizar reuniões. Seu acesso à plataforma continua com usuário e senha.</p>
  <div className="gf-actions"><Button variant="primary" disabled={busy||!ready} onClick={connect}>{configured?'Reconectar Google Agenda':'Conectar Google Agenda'}</Button>
   {configured&&<><Button disabled={busy} onClick={async()=>{if(await act({action:'gf_connection_test',kind:'google'}))notify?.('Acesso à sua agenda confirmado.')}}>Testar conexão</Button><Button disabled={busy} onClick={()=>setDisconnect(true)}>Desconectar agenda</Button></>}
  </div>
  {!ready&&<p>{manager?'Prepare a integração do aplicativo abaixo uma única vez.':'O administrador precisa preparar a integração Google da plataforma.'}</p>}
  {error&&<p role="alert" className="gf-error">{error}</p>}
  {disconnect&&<div role="alert"><p>Desconectar sua agenda? As reservas e os eventos existentes serão mantidos. Para revogar também no Google, remova a permissão nas conexões da sua Conta Google.</p><div className="gf-actions"><Button disabled={busy} onClick={()=>setDisconnect(false)}>Manter conexão</Button><Button disabled={busy} onClick={async()=>{if(await act({action:'gf_google_forget'})){setDisconnect(false);notify?.('Sua autorização local foi removida.')}}}>Confirmar desconexão</Button></div></div>}
  {manager&&<details><summary>Integração do aplicativo · administrador</summary><p>Configuração única do servidor. Os vendedores apenas autorizam suas próprias agendas.</p><form onSubmit={configure}><div className="form-grid"><label>Client ID Google<input required autoComplete="off" maxLength={4000} value={client} onChange={e=>setClient(e.target.value)} disabled={busy}/></label><label>Client secret Google<input type="password" autoComplete="new-password" required={!ready} maxLength={4000} value={secret} onChange={e=>setSecret(e.target.value)} disabled={busy}/></label></div><Button type="submit" disabled={busy}>Salvar integração do aplicativo</Button></form><p>Credenciais e autorizações são armazenadas de forma criptografada no servidor. No Google Cloud, mantenha o retorno <code>http://127.0.0.1:8780/oauth/google/callback</code>. Durante o modo de teste do Google, adicione as contas autorizadas à lista de usuários de teste.</p></details>}
 </section>;
}
