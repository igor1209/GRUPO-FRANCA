// Adapter is injected so lifecycle/isolation can be verified without a live account.
export function createBridge({makeClient,toQR,emit}){
  const sessions=new Map();
  const idPattern=/^[a-f0-9]{24}$/;
  const snapshot=s=>({status:s.status,number:s.number,qr:s.qr,error:s.error,qr_expires:s.qrExpires});
  function state(s,status,error=''){
    s.status=status;s.error=error;
    if(status!=='qr'){s.qr='';s.qrExpires=0;}
    emit({event:'status',connection:s.id,...snapshot(s)});
  }
  async function destroy(s){
    sessions.delete(s.id);s.closed=true;
    try{await s.client.destroy();}catch{}
  }
  async function command(r){
    if(!idPattern.test(r.connection||''))throw Error('Invalid connection');
    let s=sessions.get(r.connection);
    if(r.op==='status')return s?snapshot(s):{status:'disconnected',number:'',qr:'',error:'',qr_expires:0};
    if(r.op==='connect'){
      if(s&&!['error','disconnected','auth_failure'].includes(s.status))return snapshot(s);
      if(s)await destroy(s);
      s={id:r.connection,status:'starting',number:'',qr:'',qrExpires:0,error:'',closed:false,ready:false,client:makeClient(r.connection),sending:false};
      sessions.set(s.id,s);
      s.client.on('qr',async value=>{
        try{
          const qr=await toQR(value);
          if(s.closed)return;
          s.qr=qr;s.qrExpires=Date.now()+45000;state(s,'qr');
        }catch{if(!s.closed)state(s,'error','Não foi possível gerar o QR Code. Reconecte.');}
      });
      s.client.on('authenticated',()=>{if(!s.closed)state(s,'authenticated');});
      s.client.on('ready',()=>{
        if(s.closed)return;
        s.number=s.client.info?.wid?.user||'';
        if(!/^\d{10,15}$/.test(s.number)){state(s,'error','Não foi possível identificar o número conectado.');return;}
        s.ready=true;
        if([...sessions.values()].some(other=>other!==s&&other.status==='connected'&&other.number===s.number)){
          state(s,'error','Este número já está conectado em outra conexão.');
          return;
        }
        state(s,'connected');
      });
      s.client.on('auth_failure',()=>{s.ready=false;if(!s.closed)state(s,'auth_failure','Autenticação não concluída. Desconecte e gere outro QR Code.');});
      s.client.on('disconnected',()=>{s.ready=false;if(!s.closed)state(s,'disconnected','Sessão encerrada. Reconecte para continuar.');});
      s.client.on('message',async m=>{
        if(s.closed||s.status!=='connected'||m.fromMe||m.isStatus||m.from?.endsWith('@g.us')||m.from?.endsWith('@broadcast'))return;
        try{
          let phone=m.from?.endsWith('@c.us')?m.from.split('@')[0]:'';
          if(!phone&&m.from?.endsWith('@lid')){
            const pairs=await s.client.getContactLidAndPhone([m.from]);
            phone=(pairs?.[0]?.pn||'').split('@')[0];
          }
          if(!/^\d{10,15}$/.test(phone))return;
          // No text, media, contact names or conversation history leave the adapter.
          emit({event:'incoming',connection:s.id,message_id:m.id?._serialized,phone,timestamp:m.timestamp});
        }catch{}
      });
      s.client.on('message_ack',(m,ack)=>{
        if(!s.closed&&m.fromMe&&m.id?._serialized)emit({event:'ack',connection:s.id,message_id:m.id._serialized,ack});
      });
      Promise.resolve(s.client.initialize()).catch(()=>{if(!s.closed)state(s,'error','Falha ao abrir o WhatsApp. Verifique a internet, o Chromium e tente reconectar.');});
      return snapshot(s);
    }
    if(r.op==='disconnect'){
      if(s){
        // Logout must succeed before claiming the device has been unlinked.
        if(['starting','authenticated'].includes(s.status))throw Error('Connection is loading');
        if(s.ready){await s.client.logout();await destroy(s);}
        else {await destroy(s);await s.client.authStrategy?.logout?.();}
      }return {status:'disconnected',number:'',qr:'',error:'',qr_expires:0};
    }
    if(r.op==='send'){
      if(!s||s.status!=='connected')return {ok:false,not_sent:true,error:'Conexão indisponível.'};
      if(s.sending)return {ok:false,not_sent:true,error:'Aguarde o envio anterior.'};
      if(!/^\d{10,15}$/.test(r.phone||'')||!r.text?.trim()||r.text.length>4000)return {ok:false,not_sent:true,error:'Destino ou mensagem inválidos.'};
      if(r.phone===s.number)return {ok:false,not_sent:true,error:'Selecione um contato diferente do número conectado.'};
      s.sending=true;
      let dispatched=false;
      try{
        const jid=await s.client.getNumberId(r.phone);
        if(!jid)return {ok:false,not_sent:true,error:'Número não encontrado no WhatsApp.'};
        if(jid._serialized?.split('@')[0]===s.number)return {ok:false,not_sent:true,error:'Selecione um contato diferente do número conectado.'};
        dispatched=true;
        const message=await s.client.sendMessage(jid._serialized,r.text,{sendSeen:false});
        if(!message?.id?._serialized)return {ok:false,error:'Envio sem confirmação. Confira no WhatsApp.'};
        return {ok:true,message_id:message.id._serialized};
      }catch{return {ok:false,not_sent:!dispatched,error:'Não foi possível confirmar o envio. Confira no WhatsApp antes de repetir.'};}
      finally{s.sending=false;}
    }
    throw Error('Unknown operation');
  }
  return {command,close:()=>Promise.all([...sessions.values()].map(destroy))};
}
