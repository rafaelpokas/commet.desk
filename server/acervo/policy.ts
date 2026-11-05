import type { User } from '../types.js';
import type { Access, LibraryAsset, ContextEntry, DeskRequest } from './types.js';
export const staff = (u: User) => u.role==='admin'||u.role==='employee';
export const clientAccess = (u: User, id: string) => staff(u)|| (!!u.clientId&&u.clientId===id);
export function access(u:User, row:{clientId:string;visibility:Access}) {
  if(!clientAccess(u,row.clientId)) return false;
  if(row.visibility==='administrative') return u.role==='admin';
  return staff(u)||row.visibility==='shared';
}
export function assetAccess(u:User,a:LibraryAsset) {
  if(!access(u,a)) return false;
  return staff(u)||a.state==='aprovado'||a.createdBy===u.id;
}
export function assetView(u:User,a:LibraryAsset) {
  const {localPath,driveId,driveUrl,syncError,...safe}=a;
  return { ...safe, ...(u.role==='admin'?{driveUrl}:{}),
    available:!!localPath||!!driveId,
    syncError:staff(u)&&syncError?'Sincronização pendente; a equipe pode tentar novamente.':undefined };
}
export function contextView(u:User,c:ContextEntry) { return staff(u)?c:{...c,source:undefined}; }
export function requestView(u:User,r:DeskRequest) {
  // Internal GitHub URLs, agent routing and backend errors stay with staff.
  return staff(u)?r:{...r,issueUrl:undefined,issueNumber:undefined,agent:undefined,syncError:undefined};
}
