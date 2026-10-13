import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { addMarinaOctoberBatch, upgradeMarinaOctoberArtwork } from './marinaOctober.js';
import type { DatabaseSchema } from './db.js';

const directory = path.resolve(process.env.DATA_DIR || 'data');
const file = path.join(directory, 'commet-db.json');
const raw = fs.readFileSync(file, 'utf8');
const data: DatabaseSchema = JSON.parse(raw);
if (!data.clients.some(c => c.id === 'cli_vsd')) throw new Error('Base sem VSD. Use a instalaÃ§Ã£o VSD; nenhuma alteraÃ§Ã£o foi feita.');
const added = addMarinaOctoberBatch(data);
const updated = upgradeMarinaOctoberArtwork(data);
if (added || updated) {
  fs.writeFileSync(`${file}.before-marina-${Date.now()}.bak`, raw, { flag: 'wx' });
  const temporary = path.join(directory, 'marina-import.tmp.json');
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { flag: 'wx' });
  fs.renameSync(temporary, file);
}
console.log(`${added} entregas adicionadas, ${updated} composições atualizadas. Nenhuma aprovaÃ§Ã£o ou publicaÃ§Ã£o registrada.`);
