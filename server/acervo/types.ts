export type AssetState = 'a_comparar' | 'aprovado' | 'historico' | 'substituido';
export type Access = 'administrative' | 'internal' | 'shared';
export type SyncState = 'pending' | 'synced' | 'error';
export interface LibraryAsset {
  id: string; clientId: string; title: string; group: string;
  kind: 'marca' | 'conteudo' | 'proposta' | 'contrato' | 'referencia';
  state: AssetState; visibility: Access; origin: string; version: string;
  notes: string; sha256: string; fileName: string; mimeType: string; size: number;
  createdAt: string; createdBy: string; localPath?: string;
  driveId?: string; driveUrl?: string; sync: SyncState; syncError?: string;
  approval?: { userId: string; at: string; sha256: string; evidence: string };
}
export interface ContextEntry {
  id: string; clientId: string; title: string; text: string; date: string;
  kind: 'contexto' | 'proposta' | 'decisao' | 'processo'; visibility: Access;
  source: string;
}
export interface DeskRequest {
  id: string; clientId: string; title: string; description: string;
  assetIds: string[]; agent: string; submittedBy: string; submittedAt: string;
  sync: SyncState; issueNumber?: number; issueUrl?: string; syncError?: string;
}
export interface Catalog {
  schema: 1;
  clients: { id: string; name: string }[];
  assets: LibraryAsset[]; context: ContextEntry[]; requests: DeskRequest[];
  events?: { assetId:string; userId:string; at:string; before:AssetState; after:AssetState; sha256:string; evidence:string }[];
}
