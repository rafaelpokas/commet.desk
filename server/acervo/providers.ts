import fs from 'node:fs';
import { Readable } from 'node:stream';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { createHash } from 'node:crypto';
import type { LibraryAsset, DeskRequest } from './types.js';

export function integrations() {
  return { drive: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_REFRESH_TOKEN),
    github: !!(process.env.GITHUB_TOKEN && process.env.COMMET_GITHUB_REPOSITORY),
    identity: 'pending' as const };
}
async function googleToken() {
  if(process.env.GOOGLE_REFRESH_TOKEN) {
    const auth=new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({refresh_token:process.env.GOOGLE_REFRESH_TOKEN});
    const token=await auth.getAccessToken();if(!token.token) throw Error('Drive não autenticado');return token.token;
  }
  const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.file']});
  const client=await auth.getClient();const token=await client.getAccessToken();
  if(!token.token) throw Error('Drive não autenticado');return token.token;
}
function folderFor(a:LibraryAsset) {
  const mapping=JSON.parse(process.env.COMMET_DRIVE_FOLDERS_JSON||'{}');
  // No root fallback: missing per-client/per-visibility mapping must deny the upload.
  const folder=mapping[a.clientId]?.[a.visibility];
  if(typeof folder!=='string'||!folder) throw Error('Pasta Drive não configurada para este cliente e acesso');
  return folder;
}
export async function uploadDrive(a:LibraryAsset) {
  const parent=folderFor(a);const token=await googleToken();
  const headers={Authorization:`Bearer ${token}`};
  // appProperties + stable ID recover a completed upload after a lost response.
  const q=`trashed = false and '${parent}' in parents and appProperties has { key='commetAssetId' and value='${a.id}' }`;
  const found=await fetch('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q,fields:'files(id,webViewLink,size,appProperties)'}),{headers,signal:AbortSignal.timeout(30000)});
  if(!found.ok) throw Error('Falha na consulta do Drive');
  const existing=(await found.json() as any).files?.[0];
  if(existing && Number(existing.size)===a.size && existing.appProperties?.sha256===a.sha256) return {id:existing.id,url:existing.webViewLink};
  if(existing) throw Error('Tamanho remoto divergente');
  if(!a.localPath) throw Error('Original local indisponível');
  const bytes=fs.readFileSync(a.localPath);
  if(bytes.length!==a.size||createHash('sha256').update(bytes).digest('hex')!==a.sha256) throw Error('Original local mudou; registre outra versão');
  const session=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink,size',{
    method:'POST',headers:{...headers,'Content-Type':'application/json','X-Upload-Content-Type':a.mimeType,'X-Upload-Content-Length':String(a.size)},
    body:JSON.stringify({name:a.fileName,parents:[parent],appProperties:{commetAssetId:a.id,sha256:a.sha256}}),signal:AbortSignal.timeout(30000)});
  const location=session.headers.get('location');
  if(!session.ok||!location||new URL(location).origin!=='https://www.googleapis.com') throw Error('Drive não confirmou a sessão de upload');
  const uploaded=await fetch(location,{method:'PUT',headers:{...headers,'Content-Type':a.mimeType,'Content-Length':String(bytes.length)},body:bytes,signal:AbortSignal.timeout(60000)});
  if(!uploaded.ok) throw Error('Falha no upload para Drive');
  const file=await uploaded.json() as any;
  if(!file.id||Number(file.size)!==a.size) throw Error('Upload sem confirmação de tamanho');
  return {id:String(file.id),url:String(file.webViewLink||'')};
}
export async function downloadDrive(a:LibraryAsset) {
  const token=await googleToken();
  const response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(a.driveId!)}?alt=media`,
    {headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(60000)});
  if(!response.ok||!response.body) throw Error('Arquivo remoto indisponível');
  return Readable.fromWeb(response.body as any);
}
export async function githubIssue(r:DeskRequest) {
  const repo=process.env.COMMET_GITHUB_REPOSITORY!;
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw Error('Repositório GitHub inválido');
  const headers={Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'};
  const base=`https://api.github.com/repos/${repo}/issues`;
  const marker=`<!-- commet-request:${r.id} -->`;
  // Paginate the complete issue list; never create when duplicate recovery is incomplete.
  let finished=false;
  for(let page=1;page<=100;page++) {
    const response=await fetch(base+`?state=all&per_page=100&page=${page}`,{headers,signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw Error('Falha na consulta do GitHub');
    const items=await response.json() as any[];
    const old=items.find(i=>!i.pull_request&&i.body?.includes(marker));
    if(old) return {number:old.number,url:old.html_url};
    if(items.length<100) {finished=true;break;}
  }
  if(!finished) throw Error('Consulta GitHub incompleta; criação adiada');
  const body=[marker,`Cliente: ${r.clientId}`,`Agente de destino: ${r.agent}`,`Solicitação: ${r.id}`,`Recebida: ${r.submittedAt}`,
    '',r.description,'',`Arquivos vinculados (IDs do acervo): ${r.assetIds.join(', ')||'nenhum'}`,
    '', 'Consultar a versão e o contexto no Commet Desk e registrar execução no Brain.'].join('\n');
  const response=await fetch(base,{method:'POST',headers,body:JSON.stringify({title:r.title,body}),signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw Error('Falha ao criar demanda no GitHub');
  const issue=await response.json() as any;
  if(!issue.number||!issue.html_url) throw Error('GitHub não confirmou a demanda');
  return {number:issue.number,url:issue.html_url};
}
