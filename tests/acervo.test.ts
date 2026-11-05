import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { LibraryAsset } from '../server/acervo/types.js';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'commet-acervo-'));
process.env.COMMET_TEST_MODE='1';process.env.COMMET_DEMO_MODE='1';process.env.NODE_ENV='test';
process.env.COMMET_CATALOG_FILE=path.join(temp,'catalog.json');process.env.COMMET_ASSET_DIR=path.join(temp,'files');
process.env.DATA_DIR=temp;
const users=[
  {id:'usr_admin',role:'admin'},
  {id:'usr_ana',role:'employee'},
  {id:'usr_mariana_client',role:'client_approver',clientId:'cli_solartech'}
].map(u=>({...u,name:u.id,email:u.id+'@example.invalid',status:'active',createdAt:new Date().toISOString()}));
fs.writeFileSync(path.join(temp,'commet-db.json'),JSON.stringify({users,
  clients:[{id:'cli_solartech',name:'Cliente A',status:'active'},{id:'cli_nexalog',name:'Cliente B',status:'active'}],
  brandAssets:[],channelAssignees:[],campaigns:[],monthlyObligations:[],monthlyPlanLogs:[],deliveries:[],tasks:[],clientRequests:[],comments:[],notifications:[],auditLogs:[]}));

delete process.env.GITHUB_TOKEN;delete process.env.GOOGLE_APPLICATION_CREDENTIALS;delete process.env.GOOGLE_REFRESH_TOKEN;
const content=Buffer.from('Original preservado');const localPath=path.join(temp,'original.txt');fs.writeFileSync(localPath,content);
function asset(id:string,clientId:string,visibility:LibraryAsset['visibility'],state:LibraryAsset['state']='aprovado'):LibraryAsset {
  return {id,clientId,title:id,group:'marca',kind:visibility==='administrative'?'contrato':'marca',state,visibility,origin:'Fixture',version:'1',
    notes:'Registro de teste',sha256:createHash('sha256').update(content).digest('hex'),fileName:'original.txt',mimeType:'text/plain',size:content.length,
    createdAt:new Date().toISOString(),createdBy:'usr_admin',localPath,sync:'pending'};
}
fs.writeFileSync(process.env.COMMET_CATALOG_FILE,JSON.stringify({schema:1,
  clients:[{id:'cli_solartech',name:'Cliente A'},{id:'cli_nexalog',name:'Cliente B'}],
  assets:[asset('approved-a','cli_solartech','shared'),asset('internal-a','cli_solartech','internal'),asset('contract-a','cli_solartech','administrative'),asset('approved-b','cli_nexalog','shared')],
  context:[{id:'ctx',clientId:'cli_solartech',title:'Negociação',text:'Interno',date:'2026-11-05',kind:'proposta',visibility:'administrative',source:'Histórico privado'}],requests:[]}));
const {app}=await import('../server.js');
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const address=server.address() as {port:number};const base=`http://127.0.0.1:${address.port}`;
const nativeFetch=globalThis.fetch;
async function req(url:string,user='usr_admin',options:RequestInit={}) {
  return nativeFetch(base+url,{...options,headers:{Authorization:`Bearer ${user}`,...options.headers}});
}
const json=(body:unknown)=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
after(()=>{server.close();fs.rmSync(temp,{recursive:true,force:true})});

test('Client list, file download and query tampering preserve client isolation',async()=>{
  const response=await req('/api/library?clientId=cli_nexalog','usr_mariana_client');const data=await response.json() as any;
  assert.equal(data.assets.length,0);assert.deepEqual(data.clients.map((c:any)=>c.id),['cli_solartech']);
  assert.equal((await req('/api/library/approved-b/file','usr_mariana_client')).status,404);
  assert.equal((await req('/api/library/internal-a/file','usr_mariana_client')).status,404);
  const own=await(await req('/api/library','usr_mariana_client')).json() as any;
  assert.deepEqual(own.assets.map((a:any)=>a.id),['approved-a']);
  assert.equal('localPath' in own.assets[0],false);assert.equal('driveId' in own.assets[0],false);
  assert.equal(await(await req('/api/library/approved-a/file','usr_mariana_client')).text(),content.toString());
});
test('Employee can work on the archive without administrative contracts or proposals',async()=>{
  const data=await(await req('/api/library','usr_ana')).json() as any;
  assert.equal(data.assets.some((a:any)=>a.id==='contract-a'),false);assert.equal(data.context.length,0);
  assert.equal((await req('/api/library/contract-a/file','usr_ana')).status,404);
  const all=await(await req('/api/library')).json() as any;assert.equal(all.assets.length,4);assert.equal(all.context.length,1);
});
test('New version keeps original bytes and does not inherit approval',async()=>{
  const response=await req('/api/library/upload?'+new URLSearchParams({clientId:'cli_solartech',title:'Nova versão',fileName:'nova.txt',kind:'marca',parentAssetId:'approved-a'}),'usr_ana',
    {method:'POST',headers:{'Content-Type':'application/octet-stream'},body:'Alteração nova'});
  assert.equal(response.status,201);const data=await response.json() as any;
  assert.equal(data.asset.state,'a_comparar');assert.equal(data.asset.version,'2');assert.equal(data.asset.approval,undefined);
  assert.equal(await(await req('/api/library/approved-a/file')).text(),content.toString());
  assert.equal((await req('/api/library/'+data.asset.id+'/file','usr_mariana_client')).status,404);
});
test('Approval requires evidence and employee cannot grant approval',async()=>{
  const options={...json({state:'aprovado'}),method:'PATCH'};
  assert.equal((await req('/api/library/internal-a/state','usr_ana',options)).status,403);
  assert.equal((await req('/api/library/internal-a/state','usr_admin',options)).status,400);
  const ok=await req('/api/library/internal-a/state','usr_admin',{...json({state:'aprovado',evidence:'Decisão de teste',visibility:'shared'}),method:'PATCH'});
  assert.equal(ok.status,200);const row=(await ok.json() as any).asset;assert.equal(row.approval.sha256,row.sha256);
  const persisted=JSON.parse(fs.readFileSync(process.env.COMMET_CATALOG_FILE!,'utf8'));
  assert.equal(persisted.events.length,1);assert.equal(persisted.events[0].userId,'usr_admin');
});
test('Cross-client attachment and hidden administrative attachment cannot enter a request',async()=>{
  for(const id of ['approved-b','contract-a']) {
    const response=await req('/api/library/requests','usr_mariana_client',json({clientId:'cli_nexalog',title:'Alterar',description:'Pedido',assetIds:[id]}));
    assert.equal(response.status,400);
  }
});
test('Request survives missing credentials and uses authenticated client ID',async()=>{
  const response=await req('/api/library/requests','usr_mariana_client',json({clientId:'cli_nexalog',title:'Alterar a peça',description:'Detalhes',assetIds:['approved-a'],agent:'ti'}));
  assert.equal(response.status,201);const row=(await response.json() as any).request;
  assert.equal(row.clientId,'cli_solartech');assert.equal(row.sync,'pending');assert.equal(row.agent,undefined);
  assert.equal(row.issueUrl,undefined);
  const stored=JSON.parse(fs.readFileSync(process.env.COMMET_CATALOG_FILE!,'utf8')).requests[0];assert.equal(stored.agent,'triagem');
});
test('Demo identity is denied without explicit local mode and in production',async()=>{
  process.env.COMMET_DEMO_MODE='0';assert.equal((await req('/api/library')).status,401);
  assert.equal((await req('/api/auth/demo-users')).status,404);
  process.env.COMMET_DEMO_MODE='1';process.env.NODE_ENV='production';assert.equal((await req('/api/library')).status,401);
  process.env.NODE_ENV='test';
});
test('GitHub retry recovers an existing issue by stable marker instead of duplicating it',async()=>{
  const {githubIssue}=await import('../server/acervo/providers.js');
  process.env.COMMET_GITHUB_REPOSITORY='owner/repo';process.env.GITHUB_TOKEN='test-token';
  let posts=0;
  globalThis.fetch=(async(_url:any,options:any)=>{
    if(options?.method==='POST')posts++;
    return new Response(JSON.stringify([{number:12,html_url:'https://github.com/owner/repo/issues/12',body:'<!-- commet-request:stable-id -->'}]),{status:200,headers:{'Content-Type':'application/json'}});
  }) as typeof fetch;
  try {const result=await githubIssue({id:'stable-id',clientId:'a',title:'Pedido',description:'Descrição',assetIds:[],agent:'triagem',submittedBy:'u',submittedAt:new Date().toISOString(),sync:'pending'});assert.equal(result.number,12);assert.equal(posts,0);}
  finally{globalThis.fetch=nativeFetch;delete process.env.GITHUB_TOKEN;}
});
test('Drive uses explicit folder and resumable upload, verifies bytes and persists no public sharing',async()=>{
  const {uploadDrive}=await import('../server/acervo/providers.js');
  const {OAuth2Client}=await import('google-auth-library');
  const original=OAuth2Client.prototype.getAccessToken;
  (OAuth2Client.prototype as any).getAccessToken=async()=>({token:'test-only'});
  process.env.GOOGLE_REFRESH_TOKEN='test-only';process.env.COMMET_DRIVE_FOLDERS_JSON=JSON.stringify({cli_solartech:{internal:'private-folder'}});
  let calls=0;
  globalThis.fetch=(async(url:any,options:any)=>{
    calls++;
    if(calls===1)return new Response(JSON.stringify({files:[]}));
    if(calls===2){assert.match(String(url),/uploadType=resumable/);const m=JSON.parse(options.body);assert.deepEqual(m.parents,['private-folder']);assert.equal(m.permissions,undefined);return new Response('',{headers:{location:'https://www.googleapis.com/upload/test-session'}})}
    assert.equal(options.method,'PUT');assert.equal(Buffer.from(options.body).toString(),content.toString());
    return new Response(JSON.stringify({id:'drive-confirmed',size:String(content.length),webViewLink:'https://drive.google.com/file/d/drive-confirmed/view'}));
  }) as typeof fetch;
  try {
    const a=asset('upload-drive','cli_solartech','internal');
    assert.equal((await uploadDrive(a)).id,'drive-confirmed');assert.equal(calls,3);
    const before=calls;await assert.rejects(uploadDrive({...a,clientId:'unknown'}),/Pasta Drive/);assert.equal(calls,before);
  }finally{globalThis.fetch=nativeFetch;OAuth2Client.prototype.getAccessToken=original;delete process.env.GOOGLE_REFRESH_TOKEN;delete process.env.COMMET_DRIVE_FOLDERS_JSON;}
});
