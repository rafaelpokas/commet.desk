import express, { Router, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { requireAuth, requireAdmin, requireStaff, type AuthenticatedRequest } from '../auth.js';
import { catalog } from '../acervo/store.js';
import { access, assetAccess, assetView, clientAccess, contextView, requestView, staff } from '../acervo/policy.js';
import { integrations, downloadDrive } from '../acervo/providers.js';
import { syncCatalog } from '../acervo/sync.js';
import type { LibraryAsset, AssetState } from '../acervo/types.js';

const router=Router();
router.use(requireAuth);
router.get('/',(req:AuthenticatedRequest,res:Response)=>{
  const store=catalog(),user=req.user!;
  const clientId=typeof req.query.clientId==='string'?req.query.clientId:'';
  const inClient=(a:{clientId:string})=>!clientId||a.clientId===clientId;
  res.json({clients:store.data.clients.filter(c=>clientAccess(user,c.id)),
    assets:store.data.assets.filter(a=>inClient(a)&&assetAccess(user,a)).map(a=>assetView(user,a)),
    context:store.data.context.filter(c=>inClient(c)&&access(user,c)).map(c=>contextView(user,c)),
    requests:store.data.requests.filter(r=>inClient(r)&&clientAccess(user,r.clientId)).map(r=>requestView(user,r)),
    integrations:staff(user)?integrations():undefined});
});
router.post('/upload',express.raw({type:'application/octet-stream',limit:'25mb'}),(req:AuthenticatedRequest,res:Response)=>{
  const store=catalog(),user=req.user!;
  const clientId=staff(user)?String(req.query.clientId||''):user.clientId;
  if(!clientId||!clientAccess(user,clientId)||!store.data.clients.some(c=>c.id===clientId)) return res.status(403).json({error:'Cliente indisponível'});
  const title=String(req.query.title||'').trim().slice(0,180);
  const name=path.basename(String(req.query.fileName||'arquivo')).replace(/[^\p{L}\p{N} ._()-]/gu,'_').slice(0,160);
  const allowed:Record<string,string>={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf','.zip':'application/zip','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.txt':'text/plain'};
  const mimeType=allowed[path.extname(name).toLowerCase()];
  if(!title||!mimeType||!Buffer.isBuffer(req.body)||!req.body.length) return res.status(400).json({error:'Envie título e arquivo PNG, JPG, WebP, PDF, ZIP, DOCX ou TXT'});
  const kind=String(req.query.kind||'conteudo');
  if(!['marca','conteudo','proposta','contrato','referencia'].includes(kind)) return res.status(400).json({error:'Tipo inválido'});
  if((kind==='contrato'||kind==='proposta')&&user.role!=='admin') return res.status(403).json({error:'Documentos administrativos restritos'});
  const parent=req.query.parentAssetId?store.data.assets.find(a=>a.id===req.query.parentAssetId):undefined;
  if(req.query.parentAssetId&&(!parent||parent.clientId!==clientId||!assetAccess(user,parent))) return res.status(400).json({error:'Versão anterior indisponível'});
  const id=randomUUID(),folder=path.resolve(process.env.COMMET_ASSET_DIR||'data/acervo-files');fs.mkdirSync(folder,{recursive:true});
  const localPath=path.join(folder,id);fs.writeFileSync(localPath,req.body,{mode:0o600,flag:'wx'});
  const asset:LibraryAsset={id,clientId,title,group:parent?.group||String(req.query.group||kind).slice(0,120),kind:kind as any,
    state:'a_comparar',visibility:(kind==='contrato'||kind==='proposta')?'administrative':staff(user)?'internal':'shared',
    origin:'Upload no Commet Desk',version:parent?String((parseInt(parent.version.replace(/\D/g,''),10)||1)+1):'1',notes:'Recebido para conferência; não representa aprovação.',
    sha256:createHash('sha256').update(req.body).digest('hex'),fileName:name,mimeType,size:req.body.length,
    createdAt:new Date().toISOString(),createdBy:user.id,localPath,sync:'pending'};
  store.data.assets.push(asset);store.save();void syncCatalog();
  return res.status(201).json({asset:assetView(user,asset)});
});
router.get('/:id/file',async(req:AuthenticatedRequest,res:Response)=>{
  const asset=catalog().data.assets.find(a=>a.id===req.params.id);
  if(!asset||!assetAccess(req.user!,asset)) return res.status(404).json({error:'Arquivo indisponível'});
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, no-store');
  res.type(asset.mimeType);
  const inline=req.query.preview==='1'&&['image/png','image/jpeg','image/webp'].includes(asset.mimeType);
  res.setHeader('Content-Disposition',`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`);
  try {
    if(asset.localPath&&fs.existsSync(asset.localPath)) return res.sendFile(path.resolve(asset.localPath));
    if(asset.driveId&&integrations().drive) {const stream=await downloadDrive(asset);stream.on('error',()=>res.destroy());stream.pipe(res);return;}
    return res.status(503).json({error:'Download aguarda conexão do Drive no servidor'});
  } catch {return res.status(503).json({error:'Download temporariamente indisponível'});}
});
router.patch('/:id/state',requireAdmin,(req:AuthenticatedRequest,res:Response)=>{
  const store=catalog(),asset=store.data.assets.find(a=>a.id===req.params.id);
  if(!asset) return res.status(404).json({error:'Arquivo indisponível'});
  const state=req.body.state as AssetState;
  if(!['a_comparar','aprovado','historico','substituido'].includes(state)) return res.status(400).json({error:'Estado inválido'});
  const evidence=String(req.body.evidence||'').trim();
  if(state==='aprovado'&&!evidence) return res.status(400).json({error:'Informe a evidência de aprovação desta versão'});
  if(req.body.visibility && ['internal','shared','administrative'].includes(req.body.visibility)) {
    if((asset.kind==='contrato'||asset.kind==='proposta')&&req.body.visibility!=='administrative') return res.status(400).json({error:'Mantenha documentos administrativos no acesso administrativo'});
    asset.visibility=req.body.visibility;
  }
  store.data.events ||= [];
  store.data.events.push({assetId:asset.id,userId:req.user!.id,at:new Date().toISOString(),before:asset.state,after:state,sha256:asset.sha256,evidence});
  asset.state=state;
  if(state==='aprovado') asset.approval={userId:req.user!.id,at:new Date().toISOString(),sha256:asset.sha256,evidence};
  store.save();return res.json({asset:assetView(req.user!,asset)});
});
router.post('/requests',async(req:AuthenticatedRequest,res:Response)=>{
  const store=catalog(),user=req.user!;
  const clientId=staff(user)?String(req.body.clientId||''):user.clientId;
  if(!clientId||!clientAccess(user,clientId)||!store.data.clients.some(c=>c.id===clientId)) return res.status(403).json({error:'Cliente indisponível'});
  const title=String(req.body.title||'').trim().slice(0,180),description=String(req.body.description||'').trim().slice(0,12000);
  if(!title||!description) return res.status(400).json({error:'Título e descrição obrigatórios'});
  const assetIds=Array.isArray(req.body.assetIds)?[...new Set(req.body.assetIds)].slice(0,20) as string[]:[];
  if(assetIds.some(id=>!store.data.assets.some(a=>a.id===id&&a.clientId===clientId&&assetAccess(user,a)))) return res.status(400).json({error:'Arquivo vinculado indisponível para este cliente'});
  const agent=staff(user)&&['triagem','conteudo','visual','ti'].includes(req.body.agent)?req.body.agent:'triagem';
  const request={id:randomUUID(),clientId,title,description,assetIds,agent,submittedBy:user.id,submittedAt:new Date().toISOString(),sync:'pending' as const};
  store.data.requests.push(request);store.save();void syncCatalog();
  return res.status(201).json({request:requestView(user,request)});
});
router.post('/sync',requireStaff,async(_req,res)=>{await syncCatalog();res.json({message:'Tentativa de sincronização concluída. Confira o estado de cada item.'});});
export default router;
