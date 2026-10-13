import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createVsdSeed } from '../server/seed.js';
import { addMarinaOctoberBatch } from '../server/marinaOctober.js';

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
