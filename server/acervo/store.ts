import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Catalog } from './types.js';

export class CatalogStore {
  data: Catalog;
  constructor(public file: string) {
    // A malformed database must fail visibly, never silently reset a real archive.
    this.data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) :
      { schema: 1, clients: [], assets: [], context: [], requests: [] };
    if(this.data.schema!==1 || !Array.isArray(this.data.assets) || !Array.isArray(this.data.clients) ||
      !Array.isArray(this.data.context) || !Array.isArray(this.data.requests)) throw Error('Catálogo inválido. Restaure uma cópia válida.');
  }
  save() {
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    const tmp=this.file+'.'+randomUUID()+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify(this.data,null,2),{mode:0o600});
    fs.renameSync(tmp,this.file);
  }
}
let instance: CatalogStore | undefined;
export function catalog() {
  return instance ||= new CatalogStore(path.resolve(process.env.COMMET_CATALOG_FILE || 'data/acervo.json'));
}
