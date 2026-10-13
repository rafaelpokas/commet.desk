import {
  User,
  Client,
  ClientChannelAssignee,
  Delivery,
  InternalTask,
  MonthlyObligation,
  ClientRequest,
  Comment,
  Notification,
  AuditLog,
  OperationalMetrics
} from '../types';

let currentAuthToken: string = typeof localStorage !== 'undefined' 
  ? (localStorage.getItem('commet_auth_token') || 'usr_admin') 
  : 'usr_admin';

export function setAuthToken(token: string) {
  currentAuthToken = token;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('commet_auth_token', token);
  }
}

export function getAuthToken(): string {
  return currentAuthToken;
}

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (currentAuthToken) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || data.error || `Erro HTTP ${res.status}`;
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    (error as any).payload = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email?: string, userId?: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, userId })
    }),
  getMe: () => request<{ user: User }>('/api/auth/me'),
  getDemoUsers: () => request<{ users: User[] }>('/api/auth/demo-users'),
  resetDb: () => request<{ success: boolean; message: string }>('/api/auth/reset-db', { method: 'POST' }),

  // Users
  getUsers: () => request<{ users: User[] }>('/api/users'),
  createUser: (data: Partial<User>) =>
    request<{ user: User; message: string }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  changeUserRole: (id: string, role: string) =>
    request<{ user: User; message: string }>(`/api/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    }),
  deactivateUser: (id: string) =>
    request<{ user: User; reallocatedTasksCount: number; message: string }>(`/api/users/${id}/deactivate`, {
      method: 'PATCH'
    }),
  activateUser: (id: string) =>
    request<{ user: User; message: string }>(`/api/users/${id}/activate`, {
      method: 'PATCH'
    }),

  // Clients
  getClients: () => request<{ clients: Client[] }>('/api/clients'),
  getClient: (id: string) => request<{ client: Client }>(`/api/clients/${id}`),
  createClient: (data: Partial<Client>) =>
    request<{ client: Client; message: string }>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateClient: (id: string, data: Partial<Client>) =>
    request<{ client: Client; message: string }>(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  // Channel Assignees
  getChannelAssignees: () => request<{ assignees: ClientChannelAssignee[] }>('/api/channel-assignees'),
  setChannelAssignee: (clientId: string, channel: string, defaultAssigneeId: string) =>
    request<{ message: string; assignees: ClientChannelAssignee[] }>('/api/channel-assignees', {
      method: 'POST',
      body: JSON.stringify({ clientId, channel, defaultAssigneeId })
    }),

  // Deliveries
  getDeliveries: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ deliveries: Delivery[] }>(`/api/deliveries${query ? `?${query}` : ''}`);
  },
  getDelivery: (id: string) => request<{ delivery: Delivery }>(`/api/deliveries/${id}`),
  createDelivery: (data: any) =>
    request<{ delivery: Delivery; message: string }>('/api/deliveries', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateDelivery: (id: string, data: any) =>
    request<{ delivery: Delivery; newVersionCreated: boolean; message: string }>(`/api/deliveries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  sendApproval: (id: string) =>
    request<{ delivery: Delivery; message: string }>(`/api/deliveries/${id}/send-approval`, {
      method: 'POST'
    }),
  submitApprovalDecision: (id: string, versionNumber: number, decision: string, feedbackNotes?: string) =>
    request<{ delivery: Delivery; decision: string; message: string }>(`/api/deliveries/${id}/approval-decision`, {
      method: 'POST',
      body: JSON.stringify({ versionNumber, decision, feedbackNotes })
    }),
  transitionStatus: (id: string, data: {
    targetStatus: string;
    actualPublicationDate?: string;
    publicationProof?: string;
    isScheduledConfirmed?: boolean;
    cancellationReason?: string;
  }) =>
    request<{ delivery: Delivery; message: string }>(`/api/deliveries/${id}/transition-status`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  toggleBlock: (id: string, isBlocked: boolean, blockedReason?: string) =>
    request<{ delivery: Delivery; message: string }>(`/api/deliveries/${id}/toggle-block`, {
      method: 'POST',
      body: JSON.stringify({ isBlocked, blockedReason })
    }),
  rescheduleDelivery: (id: string, newDate: string, reason?: string) =>
    request<{ delivery: Delivery; message: string }>(`/api/deliveries/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ newDate, reason })
    }),

  // Tasks
  getTasks: (deliveryId?: string) => {
    const q = deliveryId ? `?deliveryId=${deliveryId}` : '';
    return request<{ tasks: InternalTask[] }>(`/api/tasks${q}`);
  },
  createTask: (data: { deliveryId: string; title: string; type?: string; assigneeId?: string }) =>
    request<{ task: InternalTask; message: string }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  claimTask: (id: string) =>
    request<{ task: InternalTask; message: string }>(`/api/tasks/${id}/claim`, {
      method: 'POST'
    }),
  unassignTask: (id: string) =>
    request<{ task: InternalTask; message: string }>(`/api/tasks/${id}/unassign`, {
      method: 'POST'
    }),
  toggleTask: (id: string) =>
    request<{ task: InternalTask; message: string }>(`/api/tasks/${id}/toggle`, {
      method: 'PATCH'
    }),

  // Plans
  getObligations: (clientId?: string) => {
    const q = clientId ? `?clientId=${clientId}` : '';
    return request<{ obligations: MonthlyObligation[] }>(`/api/plans/obligations${q}`);
  },
  createObligation: (data: Partial<MonthlyObligation>) =>
    request<{ obligation: MonthlyObligation; message: string }>('/api/plans/obligations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  generateMonthlyPlan: (clientId: string, competenceMonth: string) =>
    request<{
      success: boolean;
      alreadyGenerated: boolean;
      createdCount: number;
      existingCount: number;
      message: string;
    }>('/api/plans/generate', {
      method: 'POST',
      body: JSON.stringify({ clientId, competenceMonth })
    }),

  // Requests
  getRequests: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ requests: ClientRequest[] }>(`/api/requests${query ? `?${query}` : ''}`);
  },
  createRequest: (data: Partial<ClientRequest>) =>
    request<{ request: ClientRequest; message: string }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  reviewRequest: (id: string, data: { status?: string; isOutOfScope?: boolean; reviewNotes?: string }) =>
    request<{ request: ClientRequest; message: string }>(`/api/requests/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  adminAcceptRequest: (id: string) =>
    request<{ request: ClientRequest; message: string }>(`/api/requests/${id}/admin-accept`, {
      method: 'POST'
    }),
  convertRequest: (id: string, competenceMonth?: string) =>
    request<{ delivery: Delivery; request: ClientRequest; message: string }>(`/api/requests/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({ competenceMonth })
    }),

  // Comments
  getComments: (deliveryId?: string) => {
    const q = deliveryId ? `?deliveryId=${deliveryId}` : '';
    return request<{ comments: Comment[] }>(`/api/comments${q}`);
  },
  createComment: (data: { deliveryId: string; content: string; isInternal: boolean; versionNumberTarget?: number }) =>
    request<{ comment: Comment; message: string }>('/api/comments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Notifications
  getNotifications: () => request<{ notifications: Notification[]; unreadCount: number }>('/api/notifications'),
  markNotificationRead: (id: string) =>
    request<{ notification: Notification }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () =>
    request<{ success: boolean; count: number }>('/api/notifications/read-all', { method: 'POST' }),

  // Metrics
  getOperationalMetrics: (competence: string = '2026-10', clientId?: string) => {
    const params = new URLSearchParams({ competence });
    if (clientId) params.append('clientId', clientId);
    return request<OperationalMetrics>(`/api/metrics/operational?${params.toString()}`);
  },

  // Audit Logs
  getAuditLogs: (deliveryId?: string, clientId?: string) => {
    const p = new URLSearchParams();
    if (deliveryId) p.append('deliveryId', deliveryId);
    if (clientId) p.append('clientId', clientId);
    return request<{ logs: AuditLog[] }>(`/api/audit-logs?${p.toString()}`);
  }
};
