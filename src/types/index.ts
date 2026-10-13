export type UserRole = 'admin' | 'employee' | 'client_approver' | 'client_viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientId?: string;
  title?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type Channel = 'instagram' | 'linkedin' | 'tiktok' | 'youtube' | 'facebook' | 'blog';

export interface ClientChannelAssignee {
  id: string;
  clientId: string;
  channel: Channel;
  defaultAssigneeId: string;
}

export interface ClientBrandKit {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  guidelinesNotes?: string;
  fonts?: string[];
  referenceLinks?: string[];
}

export interface Client {
  id: string;
  name: string;
  tradeName: string;
  status: 'active' | 'inactive';
  timezone: string;
  channels: Channel[];
  brandKit: ClientBrandKit;
  createdAt: string;
}

export type ProductionStatus = 
  | 'nao_iniciado'
  | 'em_producao'
  | 'revisao_interna'
  | 'pronto_para_publicar'
  | 'agendado'
  | 'publicado'
  | 'cancelado';

export type ApprovalStatus = 
  | 'nao_solicitado'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'ajustes_solicitados'
  | 'reprovado';

export type DeliveryPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type DeliveryVisibility = 'internal' | 'shared';

export interface DeliveryVersion {
  versionNumber: number;
  title: string;
  briefing: string;
  copywriting: string;
  mediaUrls: string[];
  channel: Channel;
  scheduledPublicationDate?: string;
  changeSummary?: string;
  createdAt: string;
  createdByUserId: string;
  createdByName: string;
  decision?: {
    status: 'aprovado' | 'ajustes_solicitados' | 'reprovado';
    decidedByUserId: string;
    decidedByName: string;
    decidedAt: string;
    feedbackNotes?: string;
  };
}

export interface InternalTask {
  id: string;
  deliveryId: string;
  title: string;
  type: 'redacao' | 'design' | 'revisao' | 'publicacao' | 'outro';
  assigneeId?: string;
  assigneeName?: string;
  completed: boolean;
  completedAt?: string;
  isInternal: boolean;
  version: number;
}

export interface Delivery {
  id: string;
  clientId: string;
  competenceMonth: string;
  campaignId?: string;
  title: string;
  channel: Channel;
  format: 'carrossel' | 'reels' | 'estatico' | 'artigo' | 'stories' | 'video';
  priority: DeliveryPriority;
  visibility: DeliveryVisibility;
  primaryAssigneeId: string;
  primaryAssigneeName: string;
  productionStatus: ProductionStatus;
  isBlocked: boolean;
  blockedReason?: string;
  cancellationReason?: string;
  internalDeadline?: string;
  approvalDeadline?: string;
  originalScheduledPublicationDate?: string;
  scheduledPublicationDate?: string;
  briefing: string;
  copywriting: string;
  mediaUrls: string[];
  currentVersionNumber: number;
  versions: DeliveryVersion[];
  approvalStatus: ApprovalStatus;
  designatedApproverId?: string;
  isScheduledConfirmed: boolean;
  actualPublicationDate?: string;
  publicationProof?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  clientId: string;
  title: string;
  objective: string;
  startDate: string;
  endDate: string;
  status: 'planejamento' | 'ativa' | 'concluida';
  createdAt: string;
}

export interface MonthlyObligation {
  id: string;
  clientId: string;
  channel: Channel;
  format: string;
  monthlyQuantity: number;
  titleTemplate: string;
}

export type RequestStatus = 'recebida' | 'em_triagem' | 'aceita' | 'nao_aceita' | 'convertida';

export interface ClientRequest {
  id: string;
  clientId: string;
  submittedByUserId: string;
  submittedByName: string;
  title: string;
  description: string;
  channel?: Channel;
  desiredDate?: string;
  suggestedPriority: DeliveryPriority;
  attachments?: string[];
  status: RequestStatus;
  isOutOfScope: boolean;
  adminAccepted: boolean;
  adminAcceptedBy?: string;
  adminAcceptedAt?: string;
  reviewNotes?: string;
  convertedDeliveryId?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  deliveryId: string;
  clientId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  isInternal: boolean;
  versionNumberTarget?: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  clientId?: string;
  title: string;
  message: string;
  linkUrl?: string;
  read: boolean;
  type: 'atribuicao' | 'envio_aprovacao' | 'decisao_aprovacao' | 'comentario' | 'alteracao_data' | 'atraso';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  deliveryId: string;
  clientId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  isPublicForClient: boolean;
  createdAt: string;
}

export interface OperationalMetrics {
  competence: string;
  totalExpected: number;
  publishedCount: number;
  fulfillmentRate: number;
  onTimeRate: number;
  avgApprovalHours: number;
  reworkRate: number;
  blockedCount: number;
  pendingApprovalCount: number;
  statusBreakdown: Record<string, number>;
  workloadByPerson: {
    userId: string;
    userName: string;
    avatarUrl?: string;
    title?: string;
    activeDeliveries: number;
    activeTasks: number;
  }[];
}
