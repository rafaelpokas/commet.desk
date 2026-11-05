import React, { useEffect, useState } from 'react';
import { FolderOpen, Upload, GitCompareArrows, Send, RefreshCw, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../lib/api';
import type { LibraryAsset, ContextEntry, DeskRequest } from '../../../server/acervo/types';

type Asset=Omit<LibraryAsset,'localPath'|'driveId'> & {available:boolean};
type Data={clients:{id:string;name:string}[];assets:Asset[];context:ContextEntry[];requests:DeskRequest[];integrations?:{drive:boolean;github:boolean;identity:string}};
async function call<T>(url:string,options:RequestInit={}):Promise<T> {
  const headers=new Headers(options.headers);headers.set('Authorization',`Bearer ${getAuthToken()}`);
  const response=await fetch('/api/library'+url,{...options,headers});
  const data=await response.json();if(!response.ok) throw Error(data.error||'Não foi possível concluir a operação.');return data;
}
async function fileBlob(id:string,preview=false) {
  const response=await fetch(`/api/library/${encodeURIComponent(id)}/file${preview?'?preview=1':''}`,{headers:{Authorization:`Bearer ${getAuthToken()}`}});
  if(!response.ok) throw Error('Arquivo indisponível para download.');return response.blob();
}
const states={a_comparar:'A comparar',aprovado:'Aprovado',historico:'Histórico',substituido:'Substituído'};
function Preview({asset}:{asset:Asset}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{
    let active=true,objectUrl='';
    if(asset.mimeType.startsWith('image/')) fileBlob(asset.id,true).then(blob=>{
      objectUrl=URL.createObjectURL(blob);if(active)setUrl(objectUrl);else URL.revokeObjectURL(objectUrl);
    }).catch(()=>{});
    return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)};
  },[asset.id]);
  return url?<img src={url} alt={asset.title} className="w-full h-52 object-contain bg-neutral-100 rounded-lg"/>:
    <div className="h-32 bg-neutral-100 flex items-center justify-center rounded-lg text-neutral-500 text-xs">{asset.mimeType==='application/pdf'?'Documento PDF':asset.fileName.split('.').pop()?.toUpperCase()||'Arquivo'}</div>;
}
export function LibraryView() {
  const {isStaff,isAdmin}=useAuth();
  const [data,setData]=useState<Data>({clients:[],assets:[],context:[],requests:[]});
  const [client,setClient]=useState(''),[search,setSearch]=useState(''),[selected,setSelected]=useState<string[]>([]);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[agent,setAgent]=useState('triagem');
  const [uploadTitle,setUploadTitle]=useState(''),[kind,setKind]=useState('conteudo');
  const load=async()=>{
    try {const result=await call<Data>('');setData(result);if(!client&&result.clients.length===1)setClient(result.clients[0].id);}
    catch(e:any){setError(e.message)};
  };
  useEffect(()=>{void load();},[]);
  const perform=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await fn();await load();}catch(e:any){setError(e.message)}finally{setBusy(false)}};
  const assets=data.assets.filter(a=>(!client||a.clientId===client)&&`${a.title} ${a.origin} ${a.group} ${a.version}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const compare=data.assets.filter(a=>selected.includes(a.id));
  const select=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<2?[...prev,id]:prev);
  const download=(a:Asset)=>perform(async()=>{
    const blob=await fileBlob(a.id);const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=a.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const upload=(file:File)=>perform(async()=>{
    if(!client||!uploadTitle.trim())throw Error('Escolha o cliente e informe o título do arquivo.');
    if(file.size>25*1024*1024)throw Error('Envie arquivos de até 25 MB.');
    const query=new URLSearchParams({clientId:client,title:uploadTitle,fileName:file.name,kind});
    if(selected.length===1) query.set('parentAssetId',selected[0]);
    await call('/upload?'+query,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:await file.arrayBuffer()});
    setUploadTitle('');setMessage('Arquivo preservado. Confira abaixo se o envio à nuvem já foi confirmado.');
  });
  const request=()=>perform(async()=>{
    if(!client)throw Error('Escolha o cliente da solicitação.');
    await call('/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:client,title,description,assetIds:selected,agent})});
    setTitle('');setDescription('');setMessage('Solicitação registrada. O estado de integração aparece no histórico abaixo.');
  });
  const state=(asset:Asset,value:string)=>perform(async()=>{
    const evidence=value==='aprovado'?window.prompt('Qual mensagem ou decisão comprova a aprovação desta versão?'):'';
    if(value==='aprovado'&&!evidence)return;
    await call(`/${encodeURIComponent(asset.id)}/state`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:value,evidence})});
  });
  return <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 space-y-6">
    <header className="flex flex-wrap gap-4 justify-between items-start">
      <div><div className="text-orange-700 text-xs uppercase font-bold tracking-widest">Commet Desk · Carteira e acervo</div><h1 className="text-2xl font-bold mt-2">Arquivos, versões e contexto</h1><p className="text-sm text-neutral-600 mt-2 max-w-2xl">Compare o que já foi feito, encontre a referência correta e peça a próxima alteração com o histórico vinculado.</p></div>
      {isStaff&&<button disabled={busy} onClick={()=>perform(async()=>{await call('/sync',{method:'POST'});setMessage('Tentativa de sincronização concluída.');})} className="flex gap-2 items-center border rounded-lg bg-white px-4 py-2 text-sm disabled:opacity-40"><RefreshCw size={16}/>Atualizar integrações</button>}
    </header>
    {data.integrations&&<div className="flex flex-wrap gap-3 text-xs text-neutral-600"><span>Drive: {data.integrations.drive?'configurado no servidor':'arquivos locais · conexão automática pendente'}</span><span>GitHub: {data.integrations.github?'configurado no servidor':'fila local · conexão automática pendente'}</span><span>Acessos: preparação local</span></div>}
    {error&&<p role="alert" className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">{error}</p>}
    {message&&<p role="status" className="bg-green-50 rounded p-3 text-sm text-green-800">{message}</p>}
    <div className="flex flex-wrap gap-3"><select aria-label="Cliente do acervo" value={client} onChange={e=>{setClient(e.target.value);setSelected([])}} className="bg-white border rounded-lg px-3 py-2 text-sm"><option value="">{isStaff?'Todos os clientes':'Escolha seu cliente'}</option>{data.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input aria-label="Pesquisar arquivos" placeholder="Buscar título, origem, versão…" className="bg-white border rounded-lg px-3 py-2 text-sm flex-1 min-w-52" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <p className="text-xs text-neutral-600">O nome “final” não define aprovação. Identidades antigas ficam no histórico. Selecione duas versões para comparar.</p>
    {!!compare.length&&<section className="border border-orange-200 bg-white rounded-xl p-5"><h2 className="flex gap-2 items-center font-semibold mb-4"><GitCompareArrows size={18}/>Comparação de versões</h2><div className="grid md:grid-cols-2 gap-6">{compare.map(a=><div key={a.id}><Preview asset={a}/><h3 className="font-semibold mt-3">{a.title}</h3><p className="text-xs mt-1">{a.origin} · {a.version} · {states[a.state]}</p><p className="text-sm mt-2 text-neutral-700 whitespace-pre-line">{a.notes}</p><p className="font-mono text-[10px] break-all mt-2">SHA-256 {a.sha256}</p></div>)}</div></section>}
    <section className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{assets.map(a=><article key={a.id} className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex justify-between gap-3"><span className="text-xs uppercase tracking-wide text-neutral-500">{data.clients.find(c=>c.id===a.clientId)?.name} · {a.kind}</span><label className="text-xs flex gap-1 items-center"><input type="checkbox" checked={selected.includes(a.id)} disabled={!selected.includes(a.id)&&selected.length>=2} onChange={()=>select(a.id)}/>Comparar</label></div>
      <Preview asset={a}/><h2 className="font-semibold">{a.title}</h2><p className="text-xs text-neutral-500">{a.origin} · versão {a.version}</p><div className="flex flex-wrap gap-2 text-xs"><span className={a.state==='aprovado'?'bg-green-100 px-2 py-1 rounded':'bg-amber-50 px-2 py-1 rounded'}>{states[a.state]}</span><span className="bg-neutral-100 px-2 py-1 rounded">{a.visibility==='administrative'?'Administrativo':a.visibility==='internal'?'Equipe':'Compartilhado'}</span><span className="px-2 py-1">{a.sync==='synced'?'Drive confirmado':a.sync==='error'?'Envio a repetir':'Cópia local · envio pendente'}</span></div><p className="text-xs text-neutral-600 whitespace-pre-line">{a.notes}</p>
      {a.approval&&<p className="text-xs text-green-800">Evidência: {a.approval.evidence}</p>}
      <div className="flex flex-wrap gap-3 text-xs"><button disabled={busy||!a.available} onClick={()=>download(a)} className="flex items-center gap-1 underline disabled:opacity-40"><Download size={14}/>Baixar</button>{a.driveUrl&&<a href={a.driveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline"><ExternalLink size={14}/>Drive</a>}{isAdmin&&<><button disabled={busy} onClick={()=>state(a,'aprovado')} className="underline">Registrar aprovação</button><button disabled={busy} onClick={()=>state(a,'historico')} className="underline">Marcar histórico</button></>}</div>
    </article>)}</section>
    {!assets.length&&<div className="bg-white border border-dashed rounded-xl p-10 text-center text-neutral-500"><FolderOpen className="mx-auto mb-3"/><p>Nenhum arquivo disponível neste recorte.</p><p className="text-xs mt-2">O contexto administrativo e as versões internas aparecem apenas para os perfis autorizados.</p></div>}
    <section className="bg-white border rounded-xl p-5"><h2 className="font-semibold mb-4">Histórico e jeito de trabalhar</h2><div className="space-y-4">{data.context.filter(c=>!client||c.clientId===client).map(c=><article key={c.id} className="border-l-2 border-orange-500 pl-4"><p className="text-xs text-neutral-500">{c.date} · {c.kind} · {data.clients.find(x=>x.id===c.clientId)?.name}</p><h3 className="font-medium mt-1">{c.title}</h3><p className="text-sm whitespace-pre-line text-neutral-700 mt-1">{c.text}</p>{c.source&&<p className="text-xs text-neutral-500 mt-2">Fonte: {c.source}</p>}</article>)}</div></section>
    <div className="grid lg:grid-cols-2 gap-5">
      <form onSubmit={e=>e.preventDefault()} className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-semibold flex gap-2 items-center"><Upload size={18}/>Salvar arquivo</h2><p className="text-xs text-neutral-500">Escolha o cliente acima. O arquivo entra para conferência, com sua versão preservada.</p><input aria-label="Título do arquivo" placeholder="Título do arquivo" value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} className="w-full border rounded p-2 text-sm"/><select aria-label="Tipo de arquivo" value={kind} onChange={e=>setKind(e.target.value)} className="border rounded p-2 text-sm"><option value="conteudo">Conteúdo</option><option value="marca">Marca</option><option value="referencia">Referência</option>{isAdmin&&<><option value="proposta">Proposta administrativa</option><option value="contrato">Contrato administrativo</option></>}</select><input aria-label="Selecionar arquivo para salvar" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.zip,.docx,.txt" disabled={busy||!client} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void upload(f)}} className="block w-full text-sm"/></form>
      <form onSubmit={e=>{e.preventDefault();void request()}} className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-semibold flex gap-2 items-center"><Send size={18}/>Solicitar alteração</h2><p className="text-xs text-neutral-500">A solicitação acompanha os arquivos selecionados e entra na fila da equipe. Integração com GitHub conserva o vínculo para os agentes.</p><input required aria-label="Título da solicitação" value={title} onChange={e=>setTitle(e.target.value)} placeholder="O que precisa mudar?" className="w-full border rounded p-2 text-sm"/><textarea required aria-label="Descrição da solicitação" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Explique o resultado esperado e cite a versão de referência." className="w-full border rounded p-2 text-sm min-h-24"/>{isStaff&&<select aria-label="Agente de destino" value={agent} onChange={e=>setAgent(e.target.value)} className="border rounded p-2 text-sm"><option value="triagem">Triagem</option><option value="conteudo">Conteúdo</option><option value="visual">Visual</option><option value="ti">TI</option></select>}<button disabled={busy||!client} className="block bg-neutral-900 text-white rounded px-4 py-2 text-sm disabled:opacity-40">Registrar solicitação</button></form>
    </div>
    <section className="bg-white border rounded-xl p-5"><h2 className="font-semibold mb-3">Solicitações e sincronização</h2>{data.requests.filter(r=>!client||r.clientId===client).map(r=><div key={r.id} className="py-3 border-t"><p className="font-medium text-sm">{r.title}</p><p className="text-xs text-neutral-600 mt-1">{r.sync==='synced'?'Vinculada ao GitHub':r.sync==='error'?'Preservada localmente · sincronização a repetir':'Preservada localmente · aguardando integração'}</p>{r.issueUrl&&<a href={r.issueUrl} target="_blank" rel="noreferrer" className="text-xs underline">Abrir demanda #{r.issueNumber}</a>}</div>)}</section>
  </div>;
}
