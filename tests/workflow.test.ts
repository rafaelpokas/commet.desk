import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

test('Piloto VSD: isolamento, arquivos e aprovação', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commet-test-'));
  process.env.DATA_DIR = dir;
  process.env.BRAND_STORAGE_DIR = path.join(dir,'assets');
  const { db } = await import('../server/db.js');
  const brand = (await import('../server/routes/brandAssets.js')).default;
  const deliveries = (await import('../server/routes/deliveries.js')).default;
  const auth = (await import('../server/routes/auth.js')).default;
  const tasks = (await import('../server/routes/tasks.js')).default;
  const plans = (await import('../server/routes/plans.js')).default;
  const app = express(); app.use(express.json({limit:'20mb'})); app.use('/api/brand',brand); app.use('/api/deliveries',deliveries); app.use('/api/auth',auth); app.use('/api/tasks',tasks); app.use('/api/plans',plans);
  const server = app.listen(0,'127.0.0.1');
  await new Promise<void>(r=>server.once('listening',r));
  const port = (server.address() as any).port;
  const call = async (url: string, method = 'GET', body?: any, user = 'usr_admin') => {
    const r = await fetch(`http://127.0.0.1:${port}${url}`, {method, headers:{'Content-Type':'application/json', ...(user ? {Authorization:`Bearer ${user}`} : {})}, body: body === undefined ? undefined : JSON.stringify(body)});
    const data = r.headers.get('content-type')?.includes('json') ? await r.json() : await r.arrayBuffer();
    return {status:r.status,data};
  };
  const pdf = Buffer.from('%PDF-1.4\n% test fixture\n%%EOF').toString('base64');
  let a: any;
  try {
    await t.test('seed contém apenas VSD, 3 propostas e nenhuma aprovação fictícia',()=>{
      assert.deepEqual(db.getClients().map(c=>c.id),['cli_vsd']);
      assert.equal(db.getDeliveries().length,3);
      assert.deepEqual(db.getDeliveries().map(d=>d.scheduledPublicationDate?.slice(0,10)),['2026-10-16','2026-10-23','2026-10-30']);
      assert.ok(db.getDeliveries().every(d=>d.approvalStatus==='nao_solicitado' && !d.isScheduledConfirmed));
    });
    await t.test('upload valida formato e não permite cliente gravar',async()=>{
      assert.equal((await call('/api/brand/cli_vsd/assets','POST',{title:'x',base64:Buffer.from('<script>x</script>').toString('base64')})).status,400);
      assert.equal((await call('/api/brand/cli_vsd/assets','POST',{title:'x',base64:pdf},'usr_marina')).status,403);
      assert.equal((await call('/api/brand/cli_vsd/assets','GET',undefined,'')).status,401);
      const r = await call('/api/brand/cli_vsd/assets','POST',{title:'Brandbook de teste',fileName:'../../marca.pdf',category:'brandbook',base64:pdf,isReference:true});
      assert.equal(r.status,201); a=r.data.asset; assert.ok(!('storageKey' in a.versions[0]));
    });
    await t.test('arquivo interno não vaza pela lista, download ou contexto',async()=>{
      assert.equal((await call('/api/brand/cli_vsd/assets','GET',undefined,'usr_marina')).data.assets.length,0);
      assert.equal((await call(a.versions[0].downloadUrl,'GET',undefined,'usr_marina')).status,404);
      assert.equal((await call('/api/brand/cli_vsd/context','GET',undefined,'usr_marina')).status,403);
      assert.equal((await call('/api/brand/cliente-inexistente/assets')).status,404);
      db.getUsers().push({id:'other-client',name:'Outro',email:'other@example.invalid',role:'client_approver',clientId:'cli_other',status:'active',createdAt:new Date().toISOString()});
      db.getClients().push({...db.getClients()[0],id:'cli_other',name:'Outro'});
      assert.equal((await call('/api/brand/cli_vsd/assets','GET',undefined,'other-client')).status,404);
    });
    await t.test('compartilhar permite download somente ao próprio cliente',async()=>{
      const r=await call(`/api/brand/cli_vsd/assets/${a.id}`,'PATCH',{revision:a.revision,visibility:'shared'}); assert.equal(r.status,200); a=r.data.asset;
      assert.equal((await call(a.versions[0].downloadUrl,'GET',undefined,'usr_marina')).status,200);
      assert.equal((await call(a.versions[0].downloadUrl,'GET',undefined,'other-client')).status,404);
    });
    await t.test('substituição conserva versão anterior e rejeita escrita concorrente',async()=>{
      const r=await call(`/api/brand/cli_vsd/assets/${a.id}/versions`,'POST',{revision:a.revision,fileName:'marca-v2.pdf',base64:pdf}); assert.equal(r.status,200);
      assert.equal((await call(`/api/brand/cli_vsd/assets/${a.id}/versions`,'POST',{revision:a.revision,fileName:'concorrente.pdf',base64:pdf})).status,409);
      a=r.data.asset; assert.equal(a.versions.length,2); assert.equal((await call(a.versions[0].downloadUrl)).status,200);
      const persisted=JSON.parse(fs.readFileSync(path.join(dir,'commet-db.json'),'utf8'));
      assert.equal(persisted.brandAssets[0].versions.length,2);
      assert.equal(fs.readdirSync(path.join(dir,'assets')).length,2);
      const context=(await call('/api/brand/cli_vsd/context')).data; assert.equal(context.references[0].versions[0].version,2);
    });
    await t.test('arquivamento preserva histórico e retira referência do contexto',async()=>{
      const r=await call(`/api/brand/cli_vsd/assets/${a.id}`,'PATCH',{revision:a.revision,archived:true}); assert.equal(r.status,200);
      assert.equal((await call('/api/brand/cli_vsd/context')).data.references.length,0);
      assert.equal((await call(a.versions[0].downloadUrl,'GET',undefined,'usr_marina')).status,404);
      assert.equal((await call(a.versions[0].downloadUrl)).status,200);
    });
    await t.test('cliente não decide antes do envio nem administrador aprova em seu nome',async()=>{
      assert.equal((await call('/api/deliveries/del_vsd_oct_1/approval-decision','POST',{versionNumber:1,decision:'aprovado'},'usr_marina')).status,409);
      await call('/api/deliveries/del_vsd_oct_1','PUT',{copywriting:'Texto atualizado antes do envio'});
      assert.equal((await call('/api/deliveries/del_vsd_oct_1/send-approval','POST')).status,200);
      assert.equal(db.getDeliveries()[0].versions[0].copywriting,'Texto atualizado antes do envio');
      assert.equal((await call('/api/deliveries/del_vsd_oct_1/approval-decision','POST',{versionNumber:1,decision:'aprovado'})).status,403);
      assert.equal((await call('/api/deliveries/del_vsd_oct_1/approval-decision','POST',{versionNumber:1,decision:'aprovado'},'usr_marina')).status,200);
      assert.equal((await call('/api/deliveries/del_vsd_oct_1/approval-decision','POST',{versionNumber:1,decision:'reprovado',feedbackNotes:'não'},'usr_marina')).status,409);
    });
    await t.test('alteração invalida aprovação e preserva a decisão anterior',async()=>{
      const r=await call('/api/deliveries/del_vsd_oct_1','PUT',{copywriting:'Texto revisado'}); assert.equal(r.status,200);
      assert.equal(r.data.delivery.currentVersionNumber,2); assert.equal(r.data.delivery.approvalStatus,'nao_solicitado');
      assert.equal(r.data.delivery.versions[0].decision.status,'aprovado');
      assert.equal((await call('/api/deliveries/del_vsd_oct_1/approval-decision','POST',{versionNumber:1,decision:'aprovado'},'usr_marina')).status,409);
      assert.equal((await call('/api/deliveries/del_vsd_oct_1/transition-status','POST',{targetStatus:'publicado',actualPublicationDate:new Date().toISOString(),publicationProof:'teste'})).status,400);
    });
    await t.test('remarcar uma versão enviada exige nova aprovação e mantém data original',async()=>{
      await call('/api/deliveries/del_vsd_oct_1/send-approval','POST');
      const r=await call('/api/deliveries/del_vsd_oct_1/reschedule','POST',{newDate:'2026-10-17T15:00:00.000Z',reason:'Ajuste de calendário'});
      assert.equal(r.status,200); assert.equal(r.data.delivery.currentVersionNumber,3);
      assert.equal(r.data.delivery.approvalStatus,'nao_solicitado');
      assert.equal(r.data.delivery.originalScheduledPublicationDate,'2026-10-16T15:00:00.000Z');
      assert.equal(r.data.delivery.versions.at(-1).scheduledPublicationDate,'2026-10-17T15:00:00.000Z');
    });
    await t.test('reset está bloqueado e plano do mês não duplica propostas',async()=>{
      assert.equal((await call('/api/auth/reset-db','POST')).status,403);
      await call('/api/plans/generate','POST',{clientId:'cli_vsd',competenceMonth:'2026-10'});
      assert.equal(db.getDeliveries().length,3);
    });
    await t.test('tarefas têm apenas um responsável concorrente e cliente desativado perde acesso',async()=>{
      const id=db.getTasks()[0].id;
      const r=await Promise.all([call(`/api/tasks/${id}/claim`,'POST'),call(`/api/tasks/${id}/claim`,'POST',undefined,'usr_operador')]);
      assert.deepEqual(r.map(r=>r.status).sort(),[200,409]);
      db.getClients()[0].status='inactive';
      assert.equal((await call('/api/brand/cli_vsd/assets','GET',undefined,'usr_marina')).status,401);
    });
  } finally { await new Promise<void>(r=>server.close(()=>r())); fs.rmSync(dir,{recursive:true,force:true}); }
});
