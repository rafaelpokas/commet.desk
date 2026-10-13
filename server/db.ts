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

interface DatabaseSchema {
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
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
        return JSON.parse(raw);
      } catch (err) {
        console.error('Falha ao ler banco de dados existente, reinicializando dados padrão:', err);
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
      console.error('Erro ao persistir banco de dados atomicamente:', err);
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
    const now = '2026-10-13T10:00:00Z';
    const competence = '2026-10';

    const users: User[] = [
      {
        id: 'usr_admin',
        name: 'Gabriel Martins (Admin)',
        email: 'admin@commet.pro',
        role: 'admin',
        title: 'Diretor de Operações',
        status: 'active',
        createdAt: now
      },
      {
        id: 'usr_ana',
        name: 'Ana Silva',
        email: 'ana@commet.pro',
        role: 'employee',
        title: 'Social Media & Designer (Instagram)',
        avatarUrl: '/src/assets/images/avatar_ana_silva_1791862280036.jpg',
        status: 'active',
        createdAt: now
      },
      {
        id: 'usr_bruno',
        name: 'Bruno Costa',
        email: 'bruno@commet.pro',
        role: 'employee',
        title: 'Redator & Estrategista B2B (LinkedIn)',
        avatarUrl: '/src/assets/images/avatar_bruno_costa_1791862279611.jpg',
        status: 'active',
        createdAt: now
      },
      {
        id: 'usr_mariana_client',
        name: 'Mariana Fontes (Aprovadora)',
        email: 'mariana@solartech.com.br',
        role: 'client_approver',
        clientId: 'cli_solartech',
        title: 'Head de Marketing SolarTech',
        avatarUrl: '/src/assets/images/avatar_mariana_client_1791862281099.jpg',
        status: 'active',
        createdAt: now
      },
      {
        id: 'usr_lucas_client',
        name: 'Lucas Nogueira (Consulta)',
        email: 'lucas@solartech.com.br',
        role: 'client_viewer',
        clientId: 'cli_solartech',
        title: 'Analista de Comunicação SolarTech',
        status: 'active',
        createdAt: now
      },
      {
        id: 'usr_carlos_client',
        name: 'Carlos Mendes (Aprovador)',
        email: 'carlos@nexalog.com.br',
        role: 'client_approver',
        clientId: 'cli_nexalog',
        title: 'Gerente Comercial Nexa Logística',
        status: 'active',
        createdAt: now
      }
    ];

    const clients: Client[] = [
      {
        id: 'cli_solartech',
        name: 'SolarTech Brasil',
        tradeName: 'SolarTech Energia Fotovoltaica',
        status: 'active',
        timezone: 'America/Sao_Paulo',
        channels: ['instagram', 'linkedin'],
        brandKit: {
          primaryColor: '#0284c7',
          secondaryColor: '#f59e0b',
          guidelinesNotes: 'Tom de voz educativo, inovador e focado em economia e sustentabilidade real para residências e empresas.',
          fonts: ['Plus Jakarta Sans', 'Inter'],
          referenceLinks: ['https://solartech.com.br/guia-marca']
        },
        createdAt: now
      },
      {
        id: 'cli_nexalog',
        name: 'Nexa Logística',
        tradeName: 'Nexa Log Soluções Integradas',
        status: 'active',
        timezone: 'America/Sao_Paulo',
        channels: ['linkedin', 'instagram'],
        brandKit: {
          primaryColor: '#0f766e',
          secondaryColor: '#10b981',
          guidelinesNotes: 'Comunicação B2B corporativa, métricas de eficiência operacional, sustentabilidade na frota elétrica.',
          fonts: ['Manrope', 'DM Sans'],
          referenceLinks: ['https://nexalog.com.br/brandbook']
        },
        createdAt: now
      }
    ];

    const channelAssignees: ClientChannelAssignee[] = [
      {
        id: 'cca_solar_insta',
        clientId: 'cli_solartech',
        channel: 'instagram',
        defaultAssigneeId: 'usr_ana'
      },
      {
        id: 'cca_solar_link',
        clientId: 'cli_solartech',
        channel: 'linkedin',
        defaultAssigneeId: 'usr_bruno'
      },
      {
        id: 'cca_nexa_insta',
        clientId: 'cli_nexalog',
        channel: 'instagram',
        defaultAssigneeId: 'usr_ana'
      },
      {
        id: 'cca_nexa_link',
        clientId: 'cli_nexalog',
        channel: 'linkedin',
        defaultAssigneeId: 'usr_bruno'
      }
    ];

    const campaigns: Campaign[] = [
      {
        id: 'cmp_solar_spring',
        clientId: 'cli_solartech',
        title: 'Primavera Solar 2026',
        objective: 'Campanha de atração com foco no aumento da radiação solar e redução na tarifa de energia.',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        status: 'ativa',
        createdAt: now
      },
      {
        id: 'cmp_nexa_ev',
        clientId: 'cli_nexalog',
        title: 'Frota Elétrica 2026',
        objective: 'Posicionar a liderança em transporte logístico sustentável zero emissões de carbono.',
        startDate: '2026-10-01',
        endDate: '2026-11-15',
        status: 'ativa',
        createdAt: now
      }
    ];

    const monthlyObligations: MonthlyObligation[] = [
      {
        id: 'obl_solar_insta',
        clientId: 'cli_solartech',
        channel: 'instagram',
        format: 'carrossel',
        monthlyQuantity: 8,
        titleTemplate: 'SolarTech Instagram - Post Educativo #{n}'
      },
      {
        id: 'obl_solar_link',
        clientId: 'cli_solartech',
        channel: 'linkedin',
        format: 'artigo',
        monthlyQuantity: 4,
        titleTemplate: 'SolarTech LinkedIn - Artigo Estratégico #{n}'
      },
      {
        id: 'obl_nexa_link',
        clientId: 'cli_nexalog',
        channel: 'linkedin',
        format: 'artigo',
        monthlyQuantity: 6,
        titleTemplate: 'Nexa LinkedIn - Caso de Sucesso Logístico #{n}'
      },
      {
        id: 'obl_nexa_insta',
        clientId: 'cli_nexalog',
        channel: 'instagram',
        format: 'reels',
        monthlyQuantity: 6,
        titleTemplate: 'Nexa Instagram - Bastidores Operacionais #{n}'
      }
    ];

    const monthlyPlanLogs: MonthlyPlanLog[] = [
      {
        id: 'mpl_solar_2026_10',
        clientId: 'cli_solartech',
        competenceMonth: '2026-10',
        generatedAt: now,
        generatedByUserId: 'usr_admin',
        deliveriesCount: 4
      }
    ];

    const deliveries: Delivery[] = [
      {
        id: 'del_solar_01',
        clientId: 'cli_solartech',
        competenceMonth: competence,
        campaignId: 'cmp_solar_spring',
        title: '5 Mitos sobre a Energia Solar Residencial',
        channel: 'instagram',
        format: 'carrossel',
        priority: 'alta',
        visibility: 'shared',
        primaryAssigneeId: 'usr_ana',
        primaryAssigneeName: 'Ana Silva',
        productionStatus: 'revisao_interna',
        isBlocked: false,
        internalDeadline: '2026-10-15T18:00:00Z',
        approvalDeadline: '2026-10-18T18:00:00Z',
        originalScheduledPublicationDate: '2026-10-20T14:00:00Z',
        scheduledPublicationDate: '2026-10-20T14:00:00Z',
        briefing: 'Carrossel de 7 slides quebrando mitos comuns (funciona em dias nublados, custo de manutenção, durabilidade dos painéis).',
        copywriting: 'Pensando em colocar energia solar mas ainda tem dúvidas? Deslize para o lado e confira os 5 principais mitos que impedem você de economizar até 95% na conta de luz! ☀️\n\nQual desses mitos você acreditava até hoje? Deixe nos comentários.',
        mediaUrls: ['/src/assets/images/post_solartech_creative_1791862281613.jpg'],
        currentVersionNumber: 1,
        versions: [
          {
            versionNumber: 1,
            title: '5 Mitos sobre a Energia Solar Residencial',
            briefing: 'Carrossel de 7 slides quebrando mitos comuns.',
            copywriting: 'Pensando em colocar energia solar mas ainda tem dúvidas? Deslize para o lado e confira os 5 principais mitos...',
            mediaUrls: ['/src/assets/images/post_solartech_creative_1791862281613.jpg'],
            channel: 'instagram',
            scheduledPublicationDate: '2026-10-20T14:00:00Z',
            createdAt: now,
            createdByUserId: 'usr_ana',
            createdByName: 'Ana Silva'
          }
        ],
        approvalStatus: 'aguardando_aprovacao',
        designatedApproverId: 'usr_mariana_client',
        isScheduledConfirmed: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'del_solar_02',
        clientId: 'cli_solartech',
        competenceMonth: competence,
        campaignId: 'cmp_solar_spring',
        title: 'Transição Energética e ESG no Setor Industrial',
        channel: 'linkedin',
        format: 'artigo',
        priority: 'media',
        visibility: 'internal', // Rascunho interno da equipe, não visível ao cliente
        primaryAssigneeId: 'usr_bruno',
        primaryAssigneeName: 'Bruno Costa',
        productionStatus: 'em_producao',
        isBlocked: false,
        internalDeadline: '2026-10-16T18:00:00Z',
        approvalDeadline: '2026-10-21T18:00:00Z',
        originalScheduledPublicationDate: '2026-10-23T11:00:00Z',
        scheduledPublicationDate: '2026-10-23T11:00:00Z',
        briefing: 'Artigo técnico para diretores de operações sobre retorno de investimento (ROI) em usinas de solo e telhados industriais.',
        copywriting: 'A transição para fontes renováveis deixou de ser apenas uma meta de sustentabilidade e se tornou um imperativo de competitividade financeira industrial...',
        mediaUrls: [],
        currentVersionNumber: 1,
        versions: [],
        approvalStatus: 'nao_solicitado',
        designatedApproverId: 'usr_mariana_client',
        isScheduledConfirmed: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'del_solar_03',
        clientId: 'cli_solartech',
        competenceMonth: competence,
        campaignId: 'cmp_solar_spring',
        title: 'Reels: Como funciona um microinversor solar?',
        channel: 'instagram',
        format: 'reels',
        priority: 'alta',
        visibility: 'shared',
        primaryAssigneeId: 'usr_ana',
        primaryAssigneeName: 'Ana Silva',
        productionStatus: 'pronto_para_publicar',
        isBlocked: false,
        internalDeadline: '2026-10-10T18:00:00Z',
        approvalDeadline: '2026-10-12T18:00:00Z',
        originalScheduledPublicationDate: '2026-10-16T17:00:00Z',
        scheduledPublicationDate: '2026-10-16T17:00:00Z',
        briefing: 'Vídeo dinâmico de 35 segundos mostrando animação 3D de microinversores.',
        copywriting: 'Você sabe por que o microinversor garante até 25% mais eficiência em dias com sombreamento parcial? Veja na prática! 💡',
        mediaUrls: ['/src/assets/images/post_solartech_creative_1791862281613.jpg'],
        currentVersionNumber: 1,
        versions: [
          {
            versionNumber: 1,
            title: 'Reels: Como funciona um microinversor solar?',
            briefing: 'Vídeo dinâmico de 35 segundos.',
            copywriting: 'Você sabe por que o microinversor garante até 25% mais eficiência...',
            mediaUrls: ['/src/assets/images/post_solartech_creative_1791862281613.jpg'],
            channel: 'instagram',
            scheduledPublicationDate: '2026-10-16T17:00:00Z',
            createdAt: '2026-10-10T10:00:00Z',
            createdByUserId: 'usr_ana',
            createdByName: 'Ana Silva',
            decision: {
              status: 'aprovado',
              decidedByUserId: 'usr_mariana_client',
              decidedByName: 'Mariana Fontes',
              decidedAt: '2026-10-12T15:30:00Z',
              feedbackNotes: 'Excelente abordagem técnica e didática. Aprovado para publicação!'
            }
          }
        ],
        approvalStatus: 'aprovado',
        designatedApproverId: 'usr_mariana_client',
        isScheduledConfirmed: false,
        createdAt: '2026-10-09T10:00:00Z',
        updatedAt: '2026-10-12T15:30:00Z'
      },
      {
        id: 'del_solar_04',
        clientId: 'cli_solartech',
        competenceMonth: competence,
        campaignId: 'cmp_solar_spring',
        title: 'Estudo de Caso: Economia de 94% na Padaria Central',
        channel: 'instagram',
        format: 'estatico',
        priority: 'media',
        visibility: 'shared',
        primaryAssigneeId: 'usr_ana',
        primaryAssigneeName: 'Ana Silva',
        productionStatus: 'publicado',
        isBlocked: false,
        internalDeadline: '2026-10-05T18:00:00Z',
        approvalDeadline: '2026-10-07T18:00:00Z',
        originalScheduledPublicationDate: '2026-10-08T15:00:00Z',
        scheduledPublicationDate: '2026-10-08T15:00:00Z',
        briefing: 'Depoimento real de cliente comercial com foto do estabelecimento.',
        copywriting: 'De R$ 4.200 para R$ 280 por mês. Veja como a Padaria Central transformou seus custos fixos instalando SolarTech!',
        mediaUrls: ['/src/assets/images/post_solartech_creative_1791862281613.jpg'],
        currentVersionNumber: 1,
        versions: [
          {
            versionNumber: 1,
            title: 'Estudo de Caso: Economia de 94% na Padaria Central',
            briefing: 'Depoimento real de cliente.',
            copywriting: 'De R$ 4.200 para R$ 280 por mês...',
            mediaUrls: ['/src/assets/images/post_solartech_creative_1791862281613.jpg'],
            channel: 'instagram',
            scheduledPublicationDate: '2026-10-08T15:00:00Z',
            createdAt: '2026-10-05T10:00:00Z',
            createdByUserId: 'usr_ana',
            createdByName: 'Ana Silva',
            decision: {
              status: 'aprovado',
              decidedByUserId: 'usr_mariana_client',
              decidedByName: 'Mariana Fontes',
              decidedAt: '2026-10-06T14:00:00Z',
              feedbackNotes: 'Aprovado sem ressalvas.'
            }
          }
        ],
        approvalStatus: 'aprovado',
        designatedApproverId: 'usr_mariana_client',
        isScheduledConfirmed: true,
        actualPublicationDate: '2026-10-08T15:05:00Z',
        publicationProof: 'https://instagram.com/p/DB12SolarTechCase',
        createdAt: '2026-10-04T10:00:00Z',
        updatedAt: '2026-10-08T15:05:00Z'
      },
      {
        id: 'del_solar_05',
        clientId: 'cli_solartech',
        competenceMonth: competence,
        title: 'Aviso sobre Nova Tarifa de Distribuição',
        channel: 'instagram',
        format: 'estatico',
        priority: 'urgente',
        visibility: 'internal',
        primaryAssigneeId: 'usr_ana',
        primaryAssigneeName: 'Ana Silva',
        productionStatus: 'em_producao',
        isBlocked: true,
        blockedReason: 'Aguardando confirmação dos números exatos junto ao setor regulatório da concessionária de energia.',
        internalDeadline: '2026-10-14T18:00:00Z',
        approvalDeadline: '2026-10-17T18:00:00Z',
        originalScheduledPublicationDate: '2026-10-19T10:00:00Z',
        scheduledPublicationDate: '2026-10-19T10:00:00Z',
        briefing: 'Post explicativo urgente sobre alteração tarifária.',
        copywriting: 'Rascunho inicial do comunicado...',
        mediaUrls: [],
        currentVersionNumber: 1,
        versions: [],
        approvalStatus: 'nao_solicitado',
        designatedApproverId: 'usr_mariana_client',
        isScheduledConfirmed: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'del_nexa_01',
        clientId: 'cli_nexalog',
        competenceMonth: competence,
        campaignId: 'cmp_nexa_ev',
        title: 'Nossa Nova Frota 100% Elétrica em São Paulo',
        channel: 'linkedin',
        format: 'artigo',
        priority: 'alta',
        visibility: 'shared',
        primaryAssigneeId: 'usr_bruno',
        primaryAssigneeName: 'Bruno Costa',
        productionStatus: 'revisao_interna',
        isBlocked: false,
        internalDeadline: '2026-10-14T18:00:00Z',
        approvalDeadline: '2026-10-16T18:00:00Z',
        originalScheduledPublicationDate: '2026-10-19T09:00:00Z',
        scheduledPublicationDate: '2026-10-19T09:00:00Z',
        briefing: 'Anúncio oficial da incorporação de 40 caminhões pesados 100% elétricos nos hubs da Grande SP.',
        copywriting: 'Eficiência logística com impacto ambiental zero. É com orgulho que anunciamos a expansão da nossa frota 100% elétrica...',
        mediaUrls: ['/src/assets/images/post_nexalog_creative_1791862281892.jpg'],
        currentVersionNumber: 1,
        versions: [
          {
            versionNumber: 1,
            title: 'Nossa Nova Frota 100% Elétrica em São Paulo',
            briefing: 'Anúncio oficial de frota elétrica.',
            copywriting: 'Eficiência logística com impacto ambiental zero. É com orgulho que anunciamos...',
            mediaUrls: ['/src/assets/images/post_nexalog_creative_1791862281892.jpg'],
            channel: 'linkedin',
            scheduledPublicationDate: '2026-10-19T09:00:00Z',
            createdAt: now,
            createdByUserId: 'usr_bruno',
            createdByName: 'Bruno Costa'
          }
        ],
        approvalStatus: 'aguardando_aprovacao',
        designatedApproverId: 'usr_carlos_client',
        isScheduledConfirmed: false,
        createdAt: now,
        updatedAt: now
      }
    ];

    const tasks: InternalTask[] = [
      {
        id: 'tsk_01',
        deliveryId: 'del_solar_01',
        title: 'Redigir texto dos 7 slides do carrossel',
        type: 'redacao',
        assigneeId: 'usr_bruno',
        assigneeName: 'Bruno Costa',
        completed: true,
        completedAt: now,
        isInternal: true,
        version: 1
      },
      {
        id: 'tsk_02',
        deliveryId: 'del_solar_01',
        title: 'Criar diagramação e arte no Figma',
        type: 'design',
        assigneeId: 'usr_ana',
        assigneeName: 'Ana Silva',
        completed: true,
        completedAt: now,
        isInternal: true,
        version: 1
      },
      {
        id: 'tsk_03',
        deliveryId: 'del_solar_01',
        title: 'Revisão ortográfica e alinhamento de diretrizes',
        type: 'revisao',
        assigneeId: 'usr_admin',
        assigneeName: 'Gabriel Martins',
        completed: true,
        completedAt: now,
        isInternal: true,
        version: 1
      },
      {
        id: 'tsk_04_available',
        deliveryId: 'del_solar_01',
        title: 'Preparar desdobramento das peças para Stories',
        type: 'design',
        assigneeId: undefined, // Tarefa livre para pegar na fila
        assigneeName: undefined,
        completed: false,
        isInternal: true,
        version: 1
      },
      {
        id: 'tsk_05',
        deliveryId: 'del_nexa_01',
        title: 'Levantar dados de redução de CO2 com setor técnico',
        type: 'redacao',
        assigneeId: 'usr_bruno',
        assigneeName: 'Bruno Costa',
        completed: true,
        completedAt: now,
        isInternal: true,
        version: 1
      }
    ];

    const clientRequests: ClientRequest[] = [
      {
        id: 'req_01',
        clientId: 'cli_solartech',
        submittedByUserId: 'usr_mariana_client',
        submittedByName: 'Mariana Fontes',
        title: 'Post comemorativo do Dia do Instalador Solar',
        description: 'Gostaríamos de homenagear nossa rede de instaladores credenciados com fotos da equipe de campo.',
        channel: 'instagram',
        desiredDate: '2026-10-25',
        suggestedPriority: 'media',
        status: 'aceita',
        isOutOfScope: false,
        adminAccepted: true,
        adminAcceptedBy: 'Gabriel Martins',
        adminAcceptedAt: now,
        reviewNotes: 'Demanda dentro da cota mensal de posts do Instagram contratada.',
        createdAt: now
      },
      {
        id: 'req_02',
        clientId: 'cli_solartech',
        submittedByUserId: 'usr_mariana_client',
        submittedByName: 'Mariana Fontes',
        title: 'Campanha Extra de Black Friday Solar (3 Posts Adicionais)',
        description: 'Precisamos de 3 publicações extras com artes exclusivas para divulgar nossa condição especial de financiamento.',
        channel: 'instagram',
        desiredDate: '2026-11-20',
        suggestedPriority: 'alta',
        status: 'em_triagem',
        isOutOfScope: true, // Fora do escopo contratado (AC15)
        adminAccepted: false,
        reviewNotes: 'Identificada como extra-contratual. Requer aceite comercial do administrador antes de virar entrega.',
        createdAt: now
      }
    ];

    const comments: Comment[] = [
      {
        id: 'cmt_01_internal',
        deliveryId: 'del_solar_01',
        clientId: 'cli_solartech',
        authorId: 'usr_ana',
        authorName: 'Ana Silva',
        authorRole: 'employee',
        content: 'Nota interna da equipe: Revisamos o slide 4 para destacar a garantia de 25 anos dos painéis.',
        isInternal: true,
        createdAt: now
      },
      {
        id: 'cmt_02_shared',
        deliveryId: 'del_solar_01',
        clientId: 'cli_solartech',
        authorId: 'usr_ana',
        authorName: 'Ana Silva',
        authorRole: 'employee',
        content: 'Olá Mariana! Esta é a versão 1 do carrossel para sua aprovação. Aguardamos suas considerações.',
        isInternal: false,
        versionNumberTarget: 1,
        createdAt: now
      }
    ];

    const notifications: Notification[] = [
      {
        id: 'notif_01',
        recipientUserId: 'usr_mariana_client',
        clientId: 'cli_solartech',
        title: 'Nova entrega enviada para aprovação',
        message: 'A entrega "5 Mitos sobre a Energia Solar Residencial" (v1) está disponível para sua análise.',
        linkUrl: '/portal/approvals',
        read: false,
        type: 'envio_aprovacao',
        createdAt: now
      },
      {
        id: 'notif_02',
        recipientUserId: 'usr_ana',
        title: 'Entrega aprovada pelo cliente',
        message: 'Mariana Fontes aprovou a entrega "Reels: Como funciona um microinversor solar?".',
        linkUrl: '/deliveries',
        read: true,
        type: 'decisao_aprovacao',
        createdAt: '2026-10-12T15:30:00Z'
      }
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'aud_01',
        deliveryId: 'del_solar_01',
        clientId: 'cli_solartech',
        userId: 'usr_ana',
        userName: 'Ana Silva',
        userRole: 'employee',
        action: 'Envio de versão 1 para aprovação do cliente',
        fieldChanged: 'approvalStatus',
        oldValue: 'nao_solicitado',
        newValue: 'aguardando_aprovacao',
        isPublicForClient: true,
        createdAt: now
      },
      {
        id: 'aud_02',
        deliveryId: 'del_solar_03',
        clientId: 'cli_solartech',
        userId: 'usr_mariana_client',
        userName: 'Mariana Fontes',
        userRole: 'client_approver',
        action: 'Aprovação da versão 1',
        fieldChanged: 'approvalStatus',
        oldValue: 'aguardando_aprovacao',
        newValue: 'aprovado',
        isPublicForClient: true,
        createdAt: '2026-10-12T15:30:00Z'
      }
    ];

    return {
      users,
      clients,
      channelAssignees,
      campaigns,
      monthlyObligations,
      monthlyPlanLogs,
      deliveries,
      tasks,
      clientRequests,
      comments,
      notifications,
      auditLogs
    };
  }
}

export const db = new Database();
