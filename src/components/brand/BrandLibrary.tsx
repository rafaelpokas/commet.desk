import React, { useEffect, useState } from 'react';
import { FolderOpen, Upload, Star, Download, Archive, FileText } from 'lucide-react';
import { api, getAuthToken } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { BrandAsset, Client } from '../../types';

type Asset = Omit<BrandAsset, 'versions'> & { versions: (BrandAsset['versions'][number] & { downloadUrl: string })[] };
export async function brandRequest(url: string, method = 'GET', body?: unknown) {
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}
async function fileData(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error('O limite é de 10 MB por arquivo.');
  const base64 = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = reject; r.readAsDataURL(file); });
  return { fileName: file.name, base64 };
}
function AssetPreview({ version }: { version: Asset['versions'][number] }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!version.mimeType.startsWith('image/')) return;
    let active = true; let objectUrl = '';
    fetch(version.downloadUrl, {headers:{Authorization:`Bearer ${getAuthToken()}`}}).then(async r=> {
      if (!r.ok) return;
      const blob = await r.blob();
      if (active) {objectUrl = URL.createObjectURL(new Blob([blob], {type:version.mimeType})); setUrl(objectUrl);}
    }).catch(()=>{});
    return ()=>{active=false; if(objectUrl) URL.revokeObjectURL(objectUrl);};
  }, [version.id]);
  return url ? <img src={url} alt={version.fileName} className="w-full h-40 object-contain rounded-lg bg-neutral-100"/> : null;
}
export function BrandLibrary({ clients, initialClientId, sourceDeliveryId, compact = false }: { clients: Client[]; initialClientId?: string; sourceDeliveryId?: string; compact?: boolean }) {
  const { isStaff, isAdmin } = useAuth();
  const [clientId, setClientId] = useState(initialClientId || clients[0]?.id || '');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('reference');
  const [visibility, setVisibility] = useState('internal');
  const [reference, setReference] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [guidelines, setGuidelines] = useState('');
  const selected = clients.find(c => c.id === clientId);
  const base = `/api/brand/${encodeURIComponent(clientId)}`;
  async function reload() { const r = await brandRequest(`${base}/assets`); setAssets(r.assets); }
  useEffect(() => {
    let live = true;
    setAssets([]); setLoading(true); setMessage('');
    if (!clientId) { setLoading(false); return; }
    Promise.all([brandRequest(`${base}/assets`), api.getClient(clientId)]).then(([a,c]) => { if (live) { setAssets(a.assets); setGuidelines(c.client.brandKit.guidelinesNotes || ''); } }).catch(e => { if(live) setMessage(e.message); }).finally(() => { if(live) setLoading(false); });
    return () => { live = false; };
  }, [clientId]);
  async function run(fn: () => Promise<void>) { setBusy(true); setMessage(''); try { await fn(); await reload(); setMessage('Alterações salvas.'); } catch(e) { setMessage((e as Error).message); } finally { setBusy(false); } }
  async function download(a: Asset, version = a.versions.at(-1)!) {
    try {
      const r = await fetch(version.downloadUrl, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      if (!r.ok) throw new Error('Não foi possível baixar o arquivo.');
      const url = URL.createObjectURL(await r.blob()); const link = document.createElement('a'); link.href = url; link.download = version.fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(e) { setMessage((e as Error).message); }
  }
  const categories: Record<string,string> = { logo: 'Logo', brandbook: 'Brandbook', reference: 'Referência criativa', photo: 'Fotografia', font: 'Tipografia', other: 'Outro' };
  return <section className={`${compact ? 'p-4' : 'p-6 md:p-8 flex-1 overflow-y-auto'} bg-neutral-50 space-y-6`}>
    <header className="flex flex-wrap justify-between gap-4">
      <div><div className="text-xs uppercase tracking-widest text-violet-700 font-semibold">Memória da marca</div><h2 className="text-2xl font-semibold mt-2 flex items-center gap-2"><FolderOpen size={24}/>Identidade & referências</h2><p className="text-sm text-neutral-500 mt-2">Arquivos oficiais, versões e exemplos que orientam cada nova demanda.</p></div>
      {!initialClientId && <select disabled={busy} aria-label="Cliente da identidade" className="border rounded-lg p-3 bg-white self-start" value={clientId} onChange={e => setClientId(e.target.value)}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
    </header>
    {message && <div role="status" className="p-3 border rounded-lg bg-white text-sm">{message}</div>}
    {!clientId ? <p>Cadastre um cliente para começar.</p> : <>
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-white border rounded-xl p-5 space-y-3"><h3 className="font-semibold">Direção criativa · {selected?.name}</h3><textarea aria-label="Diretrizes da marca" className="w-full min-h-32 border rounded-lg p-3 text-sm leading-relaxed" value={guidelines} onChange={e => setGuidelines(e.target.value)} readOnly={!isAdmin}/>{isAdmin && <button disabled={busy} className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm disabled:opacity-50" onClick={() => run(async () => { await api.updateClient(clientId, { brandKit: { guidelinesNotes: guidelines } }); })}>Salvar diretrizes</button>}</div>
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-5 text-sm space-y-3"><Star className="text-violet-700"/><h3 className="font-semibold">Uma referência que evolui</h3><p>Marque com estrela o que deve orientar as próximas criações. Ao atualizar um arquivo, a versão anterior continua disponível.</p><p className="text-neutral-600">Referência visual não substitui aprovação para publicação. Agentes ainda não estão conectados.</p>{isStaff && <button disabled={busy} className="underline font-medium" onClick={() => run(async () => { const data = await brandRequest(`${base}/context`); const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'})); const a = document.createElement('a'); a.href=url; a.download=`contexto-${clientId}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); })}>Exportar contexto para agente</button>}</div>
    </div>
    {isStaff && <form className="bg-white border rounded-xl p-5 space-y-4" onSubmit={e => { e.preventDefault(); if (!file) return; run(async () => { await brandRequest(`${base}/assets`, 'POST', { ...await fileData(file), title: title || file.name, category, notes, visibility, isReference: reference, sourceDeliveryId }); setFile(null); setTitle(''); setNotes(''); }); }}>
      <h3 className="font-semibold flex gap-2"><Upload size={18}/>{sourceDeliveryId ? 'Salvar um exemplo desta demanda na identidade' : 'Adicionar ao acervo'}</h3>
      <div className="grid md:grid-cols-3 gap-3"><input aria-label="Título do arquivo" placeholder="Nome do arquivo / referência" className="border rounded-lg p-2 text-sm" value={title} onChange={e=>setTitle(e.target.value)}/><select aria-label="Categoria" className="border rounded-lg p-2 text-sm" value={category} onChange={e=>setCategory(e.target.value)}>{Object.entries(categories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select aria-label="Visibilidade" className="border rounded-lg p-2 text-sm" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="internal">Somente equipe</option><option value="shared">Compartilhado com o cliente</option></select></div>
      <textarea aria-label="O que preservar nesta referência" placeholder="O que você gostou? O que deve ser preservado nas próximas criações?" className="border rounded-lg p-3 w-full text-sm" value={notes} onChange={e=>setNotes(e.target.value)}/>
      <div className="flex flex-wrap gap-4 items-center"><input key={file ? 'selected' : 'empty'} aria-label="Arquivo para identidade" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.woff,.woff2" onChange={e=>setFile(e.target.files?.[0] || null)} className="text-sm max-w-full"/><label className="text-sm flex gap-2"><input type="checkbox" checked={reference} onChange={e=>setReference(e.target.checked)}/>Usar como referência</label><button disabled={busy || !file} className="px-4 py-2 rounded-lg bg-violet-700 text-white text-sm disabled:opacity-40">{busy ? 'Salvando…' : 'Salvar arquivo'}</button></div><p className="text-xs text-neutral-500">PNG, JPEG, WebP, PDF, WOFF e WOFF2 · até 10 MB por arquivo · armazenamento privado no servidor.</p>
    </form>}
    <div className="flex flex-wrap justify-between gap-3"><input aria-label="Buscar no acervo" className="border rounded-lg p-2 bg-white text-sm" placeholder="Buscar no acervo…" value={search} onChange={e=>setSearch(e.target.value)}/>{isStaff && <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Mostrar arquivados</label>}</div>
    {loading ? <p>Carregando acervo…</p> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{assets.filter(a => (showArchived || !a.archived) && `${a.title} ${a.notes}`.toLowerCase().includes(search.toLowerCase())).map(a => <article key={a.id} className="bg-white border rounded-xl p-5 space-y-3">
      <AssetPreview key={a.versions.at(-1)!.id} version={a.versions.at(-1)!}/><div className="flex justify-between"><FileText className="text-violet-600"/><span className="text-xs text-neutral-500">{categories[a.category]} · v{a.versions.length}</span></div><h4 className="font-semibold break-words">{a.title}</h4><p className="text-sm whitespace-pre-wrap text-neutral-600 break-words">{a.notes || 'Sem observações.'}</p><p className="text-xs text-neutral-500">{a.visibility === 'internal' ? 'Somente equipe' : 'Compartilhado'}{a.archived ? ' · Arquivado' : ''}{a.isReference ? ' · Referência ativa' : ''}</p>
      <button className="text-sm inline-flex gap-2 items-center underline" onClick={()=>download(a)}><Download size={14}/>Baixar versão atual</button>
      {isStaff && <div className="space-y-3 pt-3 border-t"><div className="flex flex-wrap gap-3"><button disabled={busy} title="Usar como referência" onClick={()=>run(async()=>{await brandRequest(`${base}/assets/${a.id}`, 'PATCH', {revision:a.revision,isReference:!a.isReference});})} className="text-xs flex gap-1 items-center"><Star size={15} fill={a.isReference ? 'currentColor' : 'none'}/>{a.isReference ? 'Referência' : 'Favoritar'}</button><button disabled={busy} onClick={()=>run(async()=>{await brandRequest(`${base}/assets/${a.id}`, 'PATCH', {revision:a.revision,archived:!a.archived});})} className="text-xs flex gap-1 items-center"><Archive size={15}/>{a.archived ? 'Restaurar' : 'Arquivar'}</button></div>
      <label className="text-xs block">Visibilidade<select aria-label={`Visibilidade de ${a.title}`} value={a.visibility} disabled={busy} className="border rounded p-1 ml-2" onChange={e=>run(async()=>{await brandRequest(`${base}/assets/${a.id}`, 'PATCH', {revision:a.revision,visibility:e.target.value});})}><option value="internal">Equipe</option><option value="shared">Cliente</option></select></label>
      <details className="text-xs"><summary className="cursor-pointer">Editar nome e orientações</summary><form className="space-y-2 mt-2" onSubmit={e=>{e.preventDefault();const values=new FormData(e.currentTarget);run(async()=>{await brandRequest(`${base}/assets/${a.id}`, 'PATCH', {revision:a.revision,title:values.get('title'),notes:values.get('notes')});});}}><input name="title" aria-label={`Nome de ${a.title}`} defaultValue={a.title} required className="border p-2 rounded w-full"/><textarea name="notes" aria-label={`Orientações de ${a.title}`} defaultValue={a.notes} className="border p-2 rounded w-full"/><button disabled={busy} className="underline">Salvar orientações</button></form></details>
      <label className="text-xs block">Adicionar nova versão<input aria-label={`Atualizar ${a.title}`} type="file" disabled={busy} accept=".png,.jpg,.jpeg,.webp,.pdf,.woff,.woff2" className="block mt-2 max-w-full" onChange={e=>{const f=e.target.files?.[0]; e.target.value=''; if(f) run(async()=>{await brandRequest(`${base}/assets/${a.id}/versions`, 'POST', { ...await fileData(f), revision:a.revision });});}}/></label></div>}
      <details className="text-xs"><summary className="cursor-pointer">Histórico de versões</summary>{a.versions.map(v=><button key={v.id} onClick={()=>download(a,v)} className="block underline mt-2">v{v.version} · {v.fileName} · {new Date(v.createdAt).toLocaleDateString('pt-BR')}</button>)}</details>
    </article>)}</div>}
    {!loading && assets.filter(a=>!a.archived).length === 0 && <div className="border border-dashed rounded-xl p-8 text-center text-neutral-500">O acervo ainda está vazio. Adicione o brandbook e as logos oficiais para orientar a produção.</div>}
    </>}
  </section>;
}
