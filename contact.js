import {CONTACT_CONFIG} from './contact-config.js';

export const CONTACT_ENDPOINT='https://api.web3forms.com/submit';
export const CONTACT_LIMITS=Object.freeze({name:80,email:254,message:5000});
export function isContactConfigured(accessKey){
  return typeof accessKey==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(accessKey.trim());
}
export function contactPayload(fields,accessKey){
  if(!isContactConfigured(accessKey))throw Error('Wysyłanie nie jest jeszcze skonfigurowane. Spróbuj ponownie później.');
  if(fields?.botcheck)throw Error('Nie można wysłać tej wiadomości.');
  const name=typeof fields?.name==='string'?fields.name.trim():'';
  const email=typeof fields?.email==='string'?fields.email.trim():'';
  const message=typeof fields?.message==='string'?fields.message.trim():'';
  if(!name||name.length>CONTACT_LIMITS.name||/[\r\n]/.test(name))throw Error('Podaj imię (maksymalnie 80 znaków).');
  if(!email||email.length>CONTACT_LIMITS.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Podaj poprawny adres email.');
  if(!message||message.length>CONTACT_LIMITS.message)throw Error('Wpisz wiadomość (maksymalnie 5000 znaków).');
  return {access_key:accessKey.trim(),name,email,replyto:email,message,
    subject:'JP Creative Lab — nowa wiadomość',from_name:'JP Creative Lab',botcheck:''};
}
export async function sendContact(fields,{accessKey,fetchImpl=globalThis.fetch,timeoutMs=15000}={}){
  const payload=contactPayload(fields,accessKey),controller=new AbortController();
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('Nieprawidłowy czas oczekiwania.');
  let timer;
  try{
    const request=(async()=>{
      const response=await fetchImpl(CONTACT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify(payload),signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
      const result=await response.json();
      if(!response.ok||result?.success!==true)throw Error('Odrzucona wiadomość.');
      return {success:true};
    })();
    const timeout=new Promise((resolve,reject)=>{timer=setTimeout(()=>{
      controller.abort();
      reject(Error('Nie udało się potwierdzić wysyłki na czas. Spróbuj ponownie później.'));
    },timeoutMs)});
    return await Promise.race([request,timeout]);
  }catch(error){
    if(controller.signal.aborted)throw Error('Nie udało się potwierdzić wysyłki na czas. Spróbuj ponownie później.');
    throw Error('Nie udało się wysłać wiadomości. Treść została zachowana — spróbuj ponownie później.');
  }finally{clearTimeout(timer)}
}

export function setupContactForm(form,options=CONTACT_CONFIG){
  const submit=form.querySelector('[type="submit"]'),fields=form.querySelector('fieldset');
  const status=form.querySelector('[role="status"]'),notice=form.querySelector('[data-contact-setup]');
  const configured=isContactConfigured(options.accessKey);
  let busy=false;
  form.dataset.ready='true';
  form.dataset.state=configured?'idle':'unconfigured';
  submit.disabled=!configured;
  notice.hidden=configured;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy)return;
    if(!configured){status.textContent='Wysyłanie nie jest jeszcze skonfigurowane. Spróbuj ponownie później.';return;}
    if(!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form));
    try{contactPayload(values,options.accessKey)}
    catch(error){form.dataset.state='error';status.textContent=error.message;return;}
    busy=true;fields.disabled=true;submit.disabled=true;
    form.setAttribute('aria-busy','true');form.dataset.state='sending';
    submit.textContent='Wysyłanie…';status.textContent='Przekazywanie wiadomości…';
    try{
      await sendContact(values,options);
      form.reset();form.dataset.state='success';
      status.textContent='Wiadomość przyjęta do wysłania. Dziękuję!';
    }catch(error){form.dataset.state='error';status.textContent=error.message}
    finally{
      busy=false;fields.disabled=false;submit.disabled=false;form.setAttribute('aria-busy','false');
      submit.textContent='Wyślij wiadomość ↗';
      if(form.closest('#server-app')?.dataset.open==='true')status.focus({preventScroll:true});
    }
  });
}

const form=typeof document!=='undefined'?document.querySelector('#contact-form'):null;
if(form)setupContactForm(form);
