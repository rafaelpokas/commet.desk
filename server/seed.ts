import { addMarinaOctoberBatch } from './marinaOctober.js';
import type { DatabaseSchema } from './db.js';
import type { Delivery } from './types.js';

// Proposed pilot only: no fabricated approvals, publications, contacts or brand files.
export function createVsdSeed(): DatabaseSchema {
  const now = '2026-10-13T08:00:00.000Z';
  const source = 'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-1';
  const ideas = [
    {
      day: 16, internal: 14, approval: 15,
      title: 'NR-1: o risco pode estar na forma de trabalhar',
      slides: ['O risco pode estar na forma de trabalhar.', 'Metas incompatíveis com os recursos merecem atenção.', 'Sobrecarga recorrente não deve virar rotina.', 'Falta de clareza sobre responsabilidades gera conflitos.', 'Ouvir a equipe é um ponto de partida para mapear o contexto.', 'Mapear, planejar ações e acompanhar: o trabalho continua.', 'Como sua empresa acompanha esses sinais? Conheça a VSD.'],
      copy: 'Como as demandas são distribuídas na sua empresa? Carga de trabalho, comunicação e apoio da liderança merecem atenção na prevenção. Neste carrossel, propomos perguntas para começar essa conversa. Conheça a atuação da Você e Seu Direito em cursos.voceeseudireito.com.br.'
    },
    {
      day: 23, internal: 20, approval: 22,
      title: '“Isso é falta de comprometimento?” — conversas sobre trabalho',
      slides: ['Isso é falta de comprometimento?', '“Qual dessas demandas é a prioridade de hoje?”', '“Essa reunião precisa mesmo acontecer depois do expediente?”', '“Posso receber o combinado por escrito?”', '“Com esse prazo, qual entrega podemos renegociar?”', 'Limite razoável ou comunicação que precisa melhorar? Como você conduziria essa conversa?'],
      copy: 'A mesma mensagem pode ser interpretada de maneiras diferentes. O contexto, o tom e os combinados fazem diferença. Qual dessas conversas aparece na sua empresa? Compartilhe sua percepção sem expor pessoas.'
    },
    {
      day: 30, internal: 27, approval: 29,
      title: 'Sua empresa escuta. Mas o que acontece depois?',
      slides: ['Sua empresa escuta. Mas o que acontece depois?', 'Defina como receber e encaminhar relatos.', 'Oriente líderes sobre acolhimento e confidencialidade.', 'Estabeleça responsáveis e critérios de apuração.', 'Transforme aprendizados em ações e treinamento.', 'Acompanhe as ações e revise o processo.', 'Quer estruturar essa jornada? Conheça a plataforma e os serviços VSD.'],
      copy: 'Um canal de escuta precisa de um processo por trás: responsáveis, orientação, acompanhamento e melhoria. A VSD reúne serviços e capacitação para apoiar essa jornada. Consulte as soluções em cursos.voceeseudireito.com.br.'
    }
  ];
  const date = (day: number, hour = 15) => `2026-10-${String(day).padStart(2, '0')}T${hour}:00:00.000Z`;
  const deliveries: Delivery[] = ideas.map((idea, index) => ({
    id: `del_vsd_oct_${index + 1}`, clientId: 'cli_vsd', competenceMonth: '2026-10', campaignId: 'cmp_vsd_oct',
    title: idea.title, channel: 'instagram', format: 'carrossel', priority: 'media', visibility: 'shared',
    primaryAssigneeId: 'usr_admin', primaryAssigneeName: 'Rafael França', productionStatus: 'nao_iniciado',
    isBlocked: false, internalDeadline: date(idea.internal, 18), approvalDeadline: date(idea.approval, 18),
    originalScheduledPublicationDate: date(idea.day), scheduledPublicationDate: date(idea.day),
    briefing: `PROPOSTA EDITORIAL — validar pauta e conteúdo com Marina antes de produzir/publicar.\nPúblico: empresas, RH e lideranças. Objetivo: conversa qualificada e interesse nos serviços VSD.\nFormato: carrossel Instagram, 1080 × 1350. Publicação proposta às 12h (São Paulo), sem promessa de melhor horário.\n\n${idea.slides.map((s, i) => `Slide ${i + 1}: ${s}`).join('\n')}\n\nDireção: comunicação autêntica, sofisticada, sem conversas apresentadas como reais. No post de mensagens, somente a frase da pessoa, sem resposta de recrutador ou crítica pesada à geração Z. Fotos reais da Marina, sem reconstruir seu rosto. Usar os arquivos oficiais da biblioteca; não inventar logo, paleta ou tipografia.\nRevisão técnica/jurídica: Marina. Não prometer conformidade automática, diagnóstico clínico ou certificação de adequação. Confirmar oferta atual da plataforma e situação normativa antes da publicação.\nFonte consultada em 13/10/2026: ${source}\nSite indicado pelo cliente (conteúdo não recuperado na pesquisa): https://cursos.voceeseudireito.com.br/`,
    copywriting: idea.copy, mediaUrls: [], currentVersionNumber: 1, versions: [],
    approvalStatus: 'nao_solicitado', designatedApproverId: 'usr_marina', isScheduledConfirmed: false,
    createdAt: now, updatedAt: now
  }));
  const data: DatabaseSchema = {
    users: [
      { id: 'usr_admin', name: 'Rafael França', email: 'rafael@example.invalid', role: 'admin', title: 'Commet · direção e criação', status: 'active', createdAt: now },
      { id: 'usr_operador', name: 'Operador de demonstração', email: 'operador@example.invalid', role: 'employee', title: 'Perfil de teste · não é funcionário cadastrado', status: 'active', createdAt: now },
      { id: 'usr_marina', name: 'Marina Gerdully Afonso', email: 'marina@example.invalid', role: 'client_approver', clientId: 'cli_vsd', title: 'VSD · aprovação (perfil de demonstração)', status: 'active', createdAt: now }
    ],
    clients: [{ id: 'cli_vsd', name: 'Você e Seu Direito', tradeName: 'VSD', status: 'active', timezone: 'America/Sao_Paulo', channels: ['instagram', 'linkedin'], createdAt: now,
      brandKit: { guidelinesNotes: 'Público B2B: empresas, RH e lideranças. Comunicação autêntica, premium e objetiva. Evitar aparência artificial, conversas falsas e críticas pesadas à geração Z. Preservar fotos reais e qualidade do rosto da Marina. Logos, cores e fontes oficiais devem ser confirmados pelo brandbook anexado; referências anteriores não substituem o arquivo oficial. Salvar exemplos aprovados como referência, sem confundir preferência visual com aprovação para publicação.', fonts: [], referenceLinks: ['https://cursos.voceeseudireito.com.br/', 'https://contato.voceeseudireito.com.br/'] }
    }],
    channelAssignees: ['instagram', 'linkedin'].map(channel => ({ id: `cca_vsd_${channel}`, clientId: 'cli_vsd', channel: channel as 'instagram' | 'linkedin', defaultAssigneeId: 'usr_admin' })),
    campaigns: [{ id: 'cmp_vsd_oct', clientId: 'cli_vsd', title: 'Outubro VSD · prevenção e relações de trabalho', objective: 'Piloto editorial de 3 carrosséis B2B; proposta a validar com Marina.', startDate: '2026-10-13', endDate: '2026-10-31', status: 'planejamento', createdAt: now }],
    monthlyObligations: [{ id: 'obl_vsd_carrossel', clientId: 'cli_vsd', channel: 'instagram', format: 'carrossel', monthlyQuantity: 3, titleTemplate: 'VSD · Carrossel #{n} (planejamento piloto, não contrato)' }],
    monthlyPlanLogs: [{ id: 'mpl_vsd_oct', clientId: 'cli_vsd', competenceMonth: '2026-10', generatedAt: now, generatedByUserId: 'usr_admin', deliveriesCount: 3 }],
    deliveries, tasks: deliveries.flatMap(d => ['Validar pauta e fontes com Marina', 'Redigir slides e legenda', 'Criar arte usando a identidade oficial', 'Revisar e enviar para aprovação', 'Publicar manualmente e registrar evidência'].map((title, i) => ({ id: `${d.id}_task_${i}`, deliveryId: d.id, title, type: (['revisao', 'redacao', 'design', 'revisao', 'publicacao'] as const)[i], completed: false, isInternal: true, version: 1 }))),
    clientRequests: [], comments: [], notifications: [], auditLogs: [], brandAssets: []
  };
  addMarinaOctoberBatch(data);
  return data;
}
