import assert from 'node:assert/strict';
import {test} from 'node:test';
import {contactPayload,isContactConfigured,sendContact,CONTACT_ENDPOINT} from '../contact.js';

const accessKey='12345678-1234-1234-1234-123456789abc';
const fields={name:' Kuba ',email:' kuba@example.com ',message:' Wiadomość testowa. '};
test('unconfigured form and honeypot never reach the network',async()=>{
  let requests=0;const fetchImpl=()=>{requests++;throw Error('Unexpected network')};
  assert.equal(isContactConfigured(''),false);
  assert.equal(isContactConfigured('YOUR_ACCESS_KEY_HERE'),false);
  await assert.rejects(sendContact(fields,{accessKey:'',fetchImpl}),/skonfigurowane/);
  await assert.rejects(sendContact({...fields,botcheck:'on'},{accessKey,fetchImpl}),/Nie można/);
  assert.equal(requests,0);
});
test('validation trims input, limits fields, ignores extra payload fields',()=>{
  const payload=contactPayload({...fields,redirect:'https://example.com',subject:'injected'},accessKey);
  assert.equal(payload.name,'Kuba');assert.equal(payload.replyto,'kuba@example.com');
  assert.equal(payload.message,'Wiadomość testowa.');assert.equal(payload.redirect,undefined);
  assert.equal(payload.subject,'JP Creative Lab — nowa wiadomość');
  for(const data of [{...fields,name:' '},{...fields,name:'x'.repeat(81)},{...fields,name:'A\nB'},
    {...fields,email:'bad\n@example.com'},{...fields,email:'broken'},{...fields,email:'x'.repeat(250)+'@x.pl'},
    {...fields,message:' '},{...fields,message:'x'.repeat(5001)}])assert.throws(()=>contactPayload(data,accessKey));
});
test('successful request uses fixed HTTPS endpoint and requires API success',async()=>{
  let calls=0;
  const result=await sendContact(fields,{accessKey,fetchImpl:async(url,options)=>{
    calls++;assert.equal(url,CONTACT_ENDPOINT);assert.equal(options.method,'POST');
    assert.equal(options.credentials,'omit');assert.ok(options.signal instanceof AbortSignal);
    assert.equal(JSON.parse(options.body).email,'kuba@example.com');
    return {ok:true,json:async()=>({success:true})};
  }});
  assert.deepEqual(result,{success:true});assert.equal(calls,1);
});
test('HTTP, malformed JSON, API rejection and network errors cannot claim success',async()=>{
  for(const fetchImpl of [
    async()=>({ok:false,json:async()=>({success:true})}),
    async()=>({ok:true,json:async()=>({success:false,message:'<script>bad</script>'})}),
    async()=>({ok:true,json:async()=>{throw Error('bad JSON')}}),
    async()=>{throw Error('offline')},
  ])await assert.rejects(sendContact(fields,{accessKey,fetchImpl}),/Treść została zachowana/);
});
test('timeout bounds even a non-responsive transport; no automatic retries',async()=>{
  let calls=0,signal;
  await assert.rejects(sendContact(fields,{accessKey,timeoutMs:10,fetchImpl:async(url,options)=>{
    calls++;signal=options.signal;return new Promise(()=>{});
  }}),/na czas/);
  assert.equal(calls,1);assert.equal(signal.aborted,true);
});
