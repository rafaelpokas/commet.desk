import 'dotenv/config';
import { createVsdSeed } from './seed.js';
import fs from 'fs';
import path from 'path';
import {
  User,
  Client,
  ClientChannelAssignee,
  Delivery,
  Campaign,
  MonthlyObligation,
  MonthlyPlanLog,
  ClientRequest,
  InternalTask,
  Comment,
  Notification,
  AuditLog
} from './types.js';

export interface DatabaseSchema {
  brandAssets: import('./types.js').BrandAsset[];
  users: User[];
  clients: Client[];
  channelAssignees: ClientChannelAssignee[];
  campaigns: Campaign[];
  monthlyObligations: MonthlyObligation[];
  monthlyPlanLogs: MonthlyPlanLog[];
  deliveries: Delivery[];
  tasks: InternalTask[];
  clientRequests: ClientRequest[];
  comments: Comment[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const DB_FILE = path.join(DATA_DIR, 'commet-db.json');
const DB_TEMP_FILE = path.join(DATA_DIR, 'commet-db.tmp.json');

class Database {
  private data: DatabaseSchema;
  private writeLock = false;

  constructor() {
    this.data = this.loadOrInit();
  }

  private loadOrInit(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        parsed.brandAssets ??= [];
        return parsed;
      } catch (err) {
        throw new Error('Banco inválido. Restaure um backup; a base não será sobrescrita.', { cause: err });
      }
    }

    const initial = this.generateInitialSeed();
    this.saveImmediate(initial);
    return initial;
  }

  private saveImmediate(dataToSave: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_TEMP_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(DB_TEMP_FILE, DB_FILE);
    } catch (err) {
      throw err;
    }
  }

  public save() {
    this.saveImmediate(this.data);
  }

  public resetToDefault() {
    this.data = this.generateInitialSeed();
    this.save();
    return this.data;
  }

  // --- GETTERS ---
  public getBrandAssets() { return this.data.brandAssets; }
  public getUsers(): User[] { return this.data.users; }
  public getClients(): Client[] { return this.data.clients; }
  public getChannelAssignees(): ClientChannelAssignee[] { return this.data.channelAssignees; }
  public getCampaigns(): Campaign[] { return this.data.campaigns; }
  public getMonthlyObligations(): MonthlyObligation[] { return this.data.monthlyObligations; }
  public getMonthlyPlanLogs(): MonthlyPlanLog[] { return this.data.monthlyPlanLogs; }
  public getDeliveries(): Delivery[] { return this.data.deliveries; }
  public getTasks(): InternalTask[] { return this.data.tasks; }
  public getClientRequests(): ClientRequest[] { return this.data.clientRequests; }
  public getComments(): Comment[] { return this.data.comments; }
  public getNotifications(): Notification[] { return this.data.notifications; }
  public getAuditLogs(): AuditLog[] { return this.data.auditLogs; }

  // Atomic task claim (AC04)
  public atomicClaimTask(taskId: string, userId: string, userName: string): { success: boolean; task?: InternalTask; message: string } {
    const task = this.data.tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, message: 'Tarefa não encontrada.' };
    }
    if (task.assigneeId) {
      return {
        success: false,
        task,
        message: `Esta tarefa já foi assumida por ${task.assigneeName || 'outro colaborador'}.`
      };
    }

    task.assigneeId = userId;
    task.assigneeName = userName;
    task.version += 1;
    this.save();

    return {
      success: true,
      task,
      message: 'Tarefa atribuída com sucesso.'
    };
  }

  private generateInitialSeed(): DatabaseSchema {
    return createVsdSeed();
  }
}

export const db = new Database();
