import { catalog } from './store.js';
import { integrations, uploadDrive, githubIssue } from './providers.js';
let running: Promise<void>|undefined;
export function syncCatalog() {
  if(running) return running;
  running=run().finally(()=>{running=undefined});return running;
}
async function run() {
  const store=catalog(), configured=integrations();
  if(configured.drive) for(const asset of store.data.assets.filter(a=>a.sync!=='synced'&&a.localPath)) {
    try {const file=await uploadDrive(asset);asset.driveId=file.id;asset.driveUrl=file.url;asset.sync='synced';delete asset.syncError;}
    catch {asset.sync='error';asset.syncError='Drive indisponível ou sem configuração de pasta válida';}
    store.save();
  }
  if(configured.github) for(const request of store.data.requests.filter(r=>r.sync!=='synced')) {
    try {const issue=await githubIssue(request);request.issueNumber=issue.number;request.issueUrl=issue.url;request.sync='synced';delete request.syncError;}
    catch {request.sync='error';request.syncError='GitHub indisponível; solicitação local preservada';}
    store.save();
  }
}
