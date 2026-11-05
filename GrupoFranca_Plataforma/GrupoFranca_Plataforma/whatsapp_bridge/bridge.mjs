// Private JSON-lines transport over stdin/stdout: no listening network port.
import readline from 'node:readline';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createBridge} from './engine.mjs';
const stdout = process.stdout.write.bind(process.stdout);
const emit = value => stdout(JSON.stringify(value)+'\n');
// Third-party logs must never corrupt the protocol or leak QR/session data.
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.error = () => {};
const {default: wweb} = await import('whatsapp-web.js');
const {default: QRCode} = await import('qrcode');
const dataPath=resolve(process.env.GF_WA_SESSION_DIR);
mkdirSync(dataPath,{recursive:true,mode:0o700});
const bridge=createBridge({
  makeClient: id => new wweb.Client({
    authStrategy:new wweb.LocalAuth({clientId:id,dataPath}),
    puppeteer:{headless:true},
    deviceName:'Grupo França CRM',qrMaxRetries:10,
    takeoverOnConflict:false,
    webVersionCache:{type:'none'},
  }),
  toQR: value => QRCode.toDataURL(value,{width:280,margin:2}),
  emit,
});
readline.createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{
  if(line.length>32000)return;
  let request;try{request=JSON.parse(line);}catch{return;}
  Promise.resolve(bridge.command(request)).then(result=>emit({id:request.id,result}))
    .catch(()=>emit({id:request.id,error:'Falha na conexão. Consulte o status antes de repetir um envio.'}));
});
let closing=false;
async function close(){if(closing)return;closing=true;await bridge.close();process.exit(0);}
process.stdin.on('end',close);
process.on('SIGTERM',close);process.on('SIGINT',close);
