import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.js';
import { openStore } from '../src/store.js';

async function fixture(t,options={}){
 const store=openStore(':memory:');const app=createApp({store,...options});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const url=`http://127.0.0.1:${app.server.address().port}`;
 t.after(async()=>{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));store.close();});
 const request=async(path,body,headers={})=>{const response=await fetch(url+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};};
 return {...app,store,url,request};
}
test('owner auth protects every API operation and does not leak configuration',async t=>{
 const token='owner-test-token-with-more-than-32-characters';const {request,url}=await fixture(t,{ownerToken:token});
 const health=await request('/api/health');assert.equal(health.body.authRequired,true);assert.equal(JSON.stringify(health.body).includes(token),false);
 assert.equal((await request('/api/state')).status,401);assert.equal((await request('/api/actions/company',{name:'Unauthorized'})).status,401);
 assert.equal((await request('/api/state',null,{Authorization:`Bearer ${token}`})).status,200);
 const html=await fetch(url);assert.match(html.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.equal((await request('/.env')).status,404);assert.equal((await request('/src/server.js')).status,404);
});
test('cross-origin mutation, malformed inputs, and unknown actions are rejected',async t=>{
 const {request,url}=await fixture(t);
 assert.equal((await request('/api/actions/company',{name:'Attack'},{Origin:'https://evil.example'})).status,403);
 assert.equal((await request('/api/actions/__proto__',{})).status,404);
 assert.equal((await request('/api/actions/company',{name:''})).status,400);
 const bad=await fetch(url+'/api/actions/company',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(bad.status,400);
 const huge=await fetch(url+'/api/actions/company',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'x'.repeat(70000)})});assert.equal(huge.status,413);
});
test('HTTP workflow enforces approval, generates a deliverable, and verifies its audit chain',async t=>{
 const {request}=await fixture(t);const data=(await request('/api/state')).body.state;const companyId=data.companies[0].id;
 const created=await request('/api/actions/mission',{companyId,title:'Review a financial proposal',kind:'spend',amount:400});assert.equal(created.status,200);const task=created.body.result;
 assert.equal((await request('/api/actions/run',{companyId,taskId:task.id})).status,409);
 const approval=(await request('/api/state')).body.state.approvals.find(a=>a.taskId===task.id);
 assert.equal((await request('/api/actions/decision',{companyId,approvalId:approval.id,decision:'approve',note:'Prepare a draft only.'})).status,200);
 const run=await request('/api/actions/run',{companyId,taskId:task.id});assert.equal(run.status,200);assert.equal(run.body.task.status,'done');assert.match(run.body.task.artifact,/deterministic planning template/);
 const audit=(await request('/api/audit')).body;assert.equal(audit.verification.valid,true);assert.equal(audit.verification.count,audit.records.length);assert.equal(audit.records.at(-1).hash,audit.verification.head);
});
test('parallel run requests cannot execute the same mission twice',async t=>{
 let release;const provider={name:'test',generate:()=>new Promise(resolve=>{release=resolve;})};const {request,engine}=await fixture(t,{provider});const task=engine.state.tasks.find(t=>t.status==='queued');
 const first=request('/api/actions/run',{companyId:task.companyId,taskId:task.id});
 while(!release)await new Promise(r=>setTimeout(r,5));
 assert.equal((await request('/api/actions/run',{companyId:task.companyId,taskId:task.id})).status,409);release('Unique draft');assert.equal((await first).status,200);
});
test('pausing during a provider request prevents stale results from being committed',async t=>{
 let release;const provider={name:'test',generate:()=>new Promise(resolve=>{release=resolve;})};const {request,engine}=await fixture(t,{provider});const task=engine.state.tasks.find(t=>t.status==='queued');
 const run=request('/api/actions/run',{companyId:task.companyId,taskId:task.id});while(!release)await new Promise(r=>setTimeout(r,5));
 await request('/api/actions/pause',{paused:true});release('This must be discarded');assert.equal((await run).status,409);const after=(await request('/api/state')).body.state.tasks.find(t=>t.id===task.id);assert.equal(after.status,'queued');assert.equal(after.artifact,null);
});
test('provider failure is recorded without disclosing upstream error text',async t=>{
 const provider={name:'test',generate:async()=>{throw Error('sensitive upstream error');}};const {request,engine}=await fixture(t,{provider});const task=engine.state.tasks.find(t=>t.status==='queued');
 const run=await request('/api/actions/run',{companyId:task.companyId,taskId:task.id});assert.equal(run.status,502);assert.equal(JSON.stringify(run.body).includes('sensitive'),false);assert.equal(engine.task(task.companyId,task.id).status,'failed');
});
test('SQLite survives restart and recovers interrupted work',()=>{
 const dir=mkdtempSync(join(tmpdir(),'frobot-test-'));try{const path=join(dir,'test.sqlite');let store=openStore(path);let app=createApp({store});const task=app.engine.state.tasks.find(t=>t.status==='queued');app.engine.begin({companyId:task.companyId,taskId:task.id});store.save(app.engine.state);const count=store.verify().count;store.close();
 store=openStore(path);app=createApp({store});assert.equal(app.engine.task(task.companyId,task.id).status,'queued');assert.ok(store.verify().count>count);assert.ok(store.load().events.some(e=>e.type==='task.recovered'));store.close();}finally{rmSync(dir,{recursive:true,force:true});}
});
test('audit rewrites are rejected transactionally',()=>{const store=openStore(':memory:');try{const state=store.load();state.events[0].summary='tampered';assert.throws(()=>store.save(state),/cannot be changed/);assert.equal(store.verify().valid,true);}finally{store.close();}});
test('network binding fails closed without a strong Owner token',()=>{const store=openStore(':memory:');try{assert.throws(()=>createApp({store,host:'0.0.0.0'}),/requires FROBOT_OWNER_TOKEN/);assert.throws(()=>createApp({store,ownerToken:'short'}),/at least 32/);}finally{store.close();}});
