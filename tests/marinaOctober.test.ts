import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createVsdSeed } from '../server/seed.js';
import { addMarinaOctoberBatch, upgradeMarinaOctoberArtwork } from '../server/marinaOctober.js';

test('lote Marina é idempotente e mantém conteúdo e decisões existentes', () => {
  const data = createVsdSeed();
  const existing = data.deliveries[0];
  existing.approvalStatus = 'aprovado';
  existing.copywriting = 'Texto previamente aprovado';
  const snapshot = JSON.stringify(existing);
  assert.equal(addMarinaOctoberBatch(data), 0);
  assert.equal(data.deliveries.length, 9);
  assert.equal(JSON.stringify(existing), snapshot);
  const batch = data.deliveries.filter(d => d.id.startsWith('del_vsd_marina_'));
  assert.equal(batch.length, 6);
  assert.equal(batch.flatMap(d => d.mediaUrls).length, 19);
  assert.ok(batch.every(d => d.approvalStatus === 'nao_solicitado' && !d.isScheduledConfirmed && d.productionStatus === 'revisao_interna'));
  for (const d of batch) for (const url of d.mediaUrls) assert.ok(fs.existsSync(path.resolve('public', `.${url}`)), url);
});

test('lote não altera base que não contém VSD', () => {
  const data = createVsdSeed();
  data.clients = [];
  const before = JSON.stringify(data);
  assert.equal(addMarinaOctoberBatch(data), 0);
  assert.equal(JSON.stringify(data), before);
});

test('upgrade visual mantém versão antiga e datas e invalida aprovação da peça alterada', () => {
  const data = createVsdSeed();
  const item = data.deliveries.find(d=>d.id.endsWith('_apresentacao'))!;
  const old = item.versions[0];
  Object.assign(item,{mediaUrls:[...old.mediaUrls],versions:[old],currentVersionNumber:1,approvalStatus:'aprovado',productionStatus:'pronto_para_publicar',isScheduledConfirmed:true});
  const date = item.scheduledPublicationDate;
  const snapshot = JSON.stringify(old);
  assert.equal(upgradeMarinaOctoberArtwork(data),1);
  assert.equal(item.currentVersionNumber,2);
  assert.equal(JSON.stringify(item.versions[0]),snapshot);
  assert.equal(item.scheduledPublicationDate,date);
  assert.equal(item.approvalStatus,'nao_solicitado');
  assert.equal(item.isScheduledConfirmed,false);
  assert.equal(upgradeMarinaOctoberArtwork(data),0);
});
