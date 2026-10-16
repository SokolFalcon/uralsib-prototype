'use strict';
const form=document.getElementById('unlock-form'),input=document.getElementById('password'),button=document.getElementById('submit'),message=document.getElementById('message');
document.getElementById('reveal').addEventListener('click',e=>{const show=input.type==='password';input.type=show?'text':'password';e.currentTarget.textContent=show?'Скрыть':'Показать';e.currentTarget.setAttribute('aria-label',show?'Скрыть пароль':'Показать пароль');e.currentTarget.setAttribute('aria-pressed',String(show));input.focus()});
let payloadPromise;
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const blobUrl=(value,type)=>URL.createObjectURL(new Blob([value],{type}));
async function loadPayload(){if(!payloadPromise)payloadPromise=fetch(new URL('content.bin',location.href)).then(r=>{if(!r.ok)throw Error('network');return r.arrayBuffer()}).catch(e=>{payloadPromise=null;throw e});return payloadPromise}
form.addEventListener('submit',async event=>{event.preventDefault();if(!input.value||button.disabled)return;button.disabled=true;message.className='message busy';message.textContent='Открываем прототип…';let password=input.value;let plain;
try{
 if(!window.isSecureContext||!crypto.subtle||!window.DecompressionStream)throw Error('unsupported');
 const packed=new Uint8Array(await loadPayload());if(new TextDecoder().decode(packed.slice(0,4))!=='PRT1')throw Error('format');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 password='';
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:packed.slice(4,20),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
 try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:packed.slice(20,32),additionalData:new TextEncoder().encode('prototype-v1'),tagLength:128},key,packed.slice(32))}catch{throw Error('password')}
 input.value='';
 const text=await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();new Uint8Array(plain).fill(0);
 const content=JSON.parse(text),assets=Object.fromEntries(content.assets.map(a=>[a.name,blobUrl(bytes(a.data),a.type)]));
 const css=(source,base='')=>source.replace(/url\(\s*(['"]?)([^"')]+)\1\s*\)/g,(whole,quote,url)=>assets[base+url]?`url("${assets[base+url]}")`:whole);
 const fonts=blobUrl(css(content.fonts,'assets/'),'text/css'),styles=blobUrl(css(content.css),'text/css');
 const script=blobUrl('window.__assets='+JSON.stringify(assets)+';\n'+content.js,'text/javascript');
 const html=content.html.replace('href="assets/logo.svg"','href="'+assets['assets/logo.svg']+'"').replace('href="assets/fonts.css"','href="'+fonts+'"').replace('href="styles.css"','href="'+styles+'"').replace('src="app.js"','src="'+script+'"').replace('<head>','<head><meta name="robots" content="noindex,nofollow,noarchive">');
 payloadPromise=null;document.open();document.write(html);document.close();
}catch(error){password='';message.className='message';message.textContent=error.message==='password'?'Неверный пароль. Попробуйте ещё раз.':error.message==='unsupported'?'Откройте ссылку по HTTPS в актуальной версии браузера.':'Не удалось загрузить прототип. Проверьте соединение и повторите попытку.';button.disabled=false;input.focus();input.select()}
});
