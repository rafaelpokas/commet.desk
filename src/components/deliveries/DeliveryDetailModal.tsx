import { BrandLibrary } from '../brand/BrandLibrary';
import { useContext } from 'react';
import { ClientsContext } from '../../contexts/ClientsContext';
import { ClientName, useClientName } from '../../contexts/ClientsContext';
import React, { useState, useEffect } from 'react';
import { 
  Delivery, 
  DeliveryVersion, 
  InternalTask, 
  Comment, 
  AuditLog, 
  ProductionStatus 
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { 
  ProductionStatusBadge, 
  ApprovalStatusBadge, 
  ChannelIcon, 
  PriorityIndicator 
} from '../common/StatusBadge';
import { 
  X, 
  CheckCircle2, 
  RotateCcw, 
  XCircle, 
  Send, 
  Lock, 
  Unlock, 
  Calendar, 
  Clock, 
  FileText, 
  CheckSquare, 
  MessageSquare, 
  History, 
  AlertTriangle, 
  ExternalLink,
  Plus,
  UserCheck
} from 'lucide-react';

interface DeliveryDetailModalProps {
  delivery: Delivery;
  onClose: () => void;
  onRefresh: () => void;
}

export const DeliveryDetailModal: React.FC<DeliveryDetailModalProps> = ({
  delivery: initialDelivery,
  onClose,
  onRefresh
}) => {
  const { user, isStaff, isClient, canApprove: roleCanApprove } = useAuth();
  const clients = useContext(ClientsContext);
  const [showBrand, setShowBrand] = useState(false);
  const [delivery, setDelivery] = useState<Delivery>(initialDelivery);
  const canApprove = roleCanApprove && delivery.approvalStatus === 'aguardando_aprovacao' && (!delivery.designatedApproverId || delivery.designatedApproverId === user?.id);
  const [activeTab, setActiveTab] = useState<'content' | 'approval' | 'tasks' | 'comments' | 'publish' | 'audit'>('content');
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(initialDelivery.currentVersionNumber);

  // Sub-states
  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Forms
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentInternal, setNewCommentInternal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [decisionModalType, setDecisionModalType] = useState<'aprovado' | 'ajustes_solicitados' | 'reprovado' | null>(null);

  // Publishing form (AC12)
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 16));
  const [publishProof, setPublishProof] = useState('');

  // Editing content form (AC07)
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editCopywriting, setEditCopywriting] = useState(initialDelivery.copywriting);
  const [editTitle, setEditTitle] = useState(initialDelivery.title);
  const [editChangeSummary, setEditChangeSummary] = useState('');

  // Blocked toggle form
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Status message/error banner
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDeliveryData = async () => {
    try {
      const res = await api.getDelivery(delivery.id);
      setDelivery(res.delivery);
      setSelectedVersionNum(res.delivery.currentVersionNumber);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar dados da entrega');
    }
  };

  const fetchTasks = async () => {
    if (isClient) return;
    setLoadingTasks(true);
    try {
      const res = await api.getTasks(delivery.id);
      setTasks(res.tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.getComments(delivery.id);
      setComments(res.comments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.getAuditLogs(delivery.id);
      setAuditLogs(res.logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDeliveryData();
    fetchTasks();
    fetchComments();
    fetchAuditLogs();
  }, [delivery.id]);

  const displayedVersion = delivery.versions.find(v => v.versionNumber === selectedVersionNum) || {
    versionNumber: delivery.currentVersionNumber,
    title: delivery.title,
    briefing: delivery.briefing,
    copywriting: delivery.copywriting,
    mediaUrls: delivery.mediaUrls,
    channel: delivery.channel,
    scheduledPublicationDate: delivery.scheduledPublicationDate,
    createdAt: delivery.createdAt,
    createdByUserId: delivery.primaryAssigneeId,
    createdByName: delivery.primaryAssigneeName
  };

  const isCurrentVersion = selectedVersionNum === delivery.currentVersionNumber;

  // Decision submit handler (AC08, AC10)
  const handleDecisionSubmit = async () => {
    if (!decisionModalType) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await api.submitApprovalDecision(
        delivery.id,
        selectedVersionNum,
        decisionModalType,
        feedbackNotes
      );
      setSuccessMessage(res.message);
      setDecisionModalType(null);
      setFeedbackNotes('');
      await fetchDeliveryData();
      await fetchComments();
      await fetchAuditLogs();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao submeter decisão');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Content update handler (RF10, AC07)
  const handleSaveContent = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await api.updateDelivery(delivery.id, {
        expectedUpdatedAt: delivery.updatedAt,
        title: editTitle,
        copywriting: editCopywriting,
        changeSummary: editChangeSummary || 'Alteração manual de conteúdo pela equipe'
      });
      setSuccessMessage(res.message);
      setIsEditingContent(false);
      await fetchDeliveryData();
      await fetchAuditLogs();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao atualizar entrega');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send for approval (staff)
  const handleSendApproval = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await api.sendApproval(delivery.id);
      setSuccessMessage(res.message);
      await fetchDeliveryData();
      await fetchAuditLogs();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao enviar para aprovação');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Production status transition handler (AC09, AC12)
  const handleTransitionStatus = async (targetStatus: ProductionStatus) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payload: any = { targetStatus };
      if (targetStatus === 'publicado') {
        payload.actualPublicationDate = publishDate;
        payload.publicationProof = publishProof;
      } else if (targetStatus === 'agendado') {
        payload.isScheduledConfirmed = true;
      }

      const res = await api.transitionStatus(delivery.id, payload);
      setSuccessMessage(res.message);
      await fetchDeliveryData();
      await fetchAuditLogs();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro na transição de status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle blocked
  const handleToggleBlock = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.toggleBlock(delivery.id, !delivery.isBlocked, blockReason);
      setSuccessMessage(res.message);
      setIsBlocking(false);
      setBlockReason('');
      await fetchDeliveryData();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar impedimento');
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setErrorMessage(null);

    try {
      await api.createComment({
        deliveryId: delivery.id,
        content: newCommentText,
        isInternal: isClient ? false : newCommentInternal,
        versionNumberTarget: selectedVersionNum
      });
      setNewCommentText('');
      await fetchComments();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao adicionar comentário');
    }
  };

  // Atomic claim task (AC04)
  const handleClaimTask = async (taskId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.claimTask(taskId);
      setSuccessMessage(res.message);
      await fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao assumir tarefa');
    }
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await api.createTask({
        deliveryId: delivery.id,
        title: newTaskTitle.trim()
      });
      setNewTaskTitle('');
      await fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar tarefa');
    }
  };

  // Toggle task complete
  const handleToggleTask = async (taskId: string) => {
    try {
      await api.toggleTask(taskId);
      await fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar tarefa');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-start justify-between gap-4 bg-neutral-50/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <ChannelIcon channel={delivery.channel} className="w-4 h-4" />
              <span className="text-xs font-semibold text-neutral-700">
                <ClientName id={delivery.clientId}/>
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-xs font-mono text-neutral-500">{delivery.competenceMonth}</span>
              <span className="text-neutral-300">·</span>
              <PriorityIndicator priority={delivery.priority} />
              {delivery.visibility === 'internal' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-100/70 border border-amber-300 px-1.5 py-0.2 rounded font-medium">
                  <Lock className="w-3 h-3" />
                  Rascunho Interno da Equipe
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-neutral-900 leading-tight truncate">
              {delivery.title}
            </h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <ProductionStatusBadge status={delivery.productionStatus} isBlocked={delivery.isBlocked} />
              <ApprovalStatusBadge status={delivery.approvalStatus} />
              <span className="text-xs text-neutral-500 font-mono">
                Versão Vigente: v{delivery.currentVersionNumber}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded-lg transition-colors shrink-0"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banners for feedback / errors */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:underline">
              Fechar
            </button>
          </div>
        )}

        {successMessage && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:underline">
              Fechar
            </button>
          </div>
        )}

        {/* Blocked reason banner */}
        {delivery.isBlocked && delivery.blockedReason && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">Entrega com Impedimento: </span>
              {delivery.blockedReason}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 border-b border-neutral-200 bg-white flex items-center gap-6 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'content'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Conteúdo & Prévia
          </button>

          <button
            onClick={() => setActiveTab('approval')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'approval'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>Aprovação</span>
            {delivery.approvalStatus === 'aguardando_aprovacao' && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          {isStaff && (
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <span>Checklist Interno</span>
              <span className="text-[11px] font-mono text-neutral-400">
                ({tasks.filter(t => t.completed).length}/{tasks.length})
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>Conversas & Notas</span>
            <span className="text-[11px] font-mono text-neutral-400">({comments.length})</span>
          </button>

          {isStaff && (
            <button
              onClick={() => setActiveTab('publish')}
              className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === 'publish'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Publicação & Cronograma
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'audit'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Histórico & Auditoria
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB: CONTENT & PREVIEW */}
          {isStaff && <div className="mb-4"><button className="text-sm px-4 py-2 rounded-lg border border-violet-200 text-violet-700" onClick={() => setShowBrand(!showBrand)}>{showBrand ? 'Fechar identidade' : 'Consultar identidade / salvar referência desta demanda'}</button>{showBrand && <BrandLibrary compact clients={clients} initialClientId={delivery.clientId} sourceDeliveryId={delivery.id}/>}</div>}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Version selector bar */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-700">Versão visualizada:</span>
                  <select
                    value={selectedVersionNum}
                    onChange={(e) => setSelectedVersionNum(Number(e.target.value))}
                    className="text-xs font-mono bg-white border border-neutral-300 rounded px-2 py-1"
                  >
                    {delivery.versions.map(v => (
                      <option key={v.versionNumber} value={v.versionNumber}>
                        v{v.versionNumber} {v.versionNumber === delivery.currentVersionNumber ? '(Vigente)' : '(Anterior)'}
                      </option>
                    ))}
                  </select>
                  {!isCurrentVersion && (
                    <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Você está consultando um histórico de versão anterior.
                    </span>
                  )}
                </div>

                {isStaff && !isEditingContent && (
                  <button
                    onClick={() => {
                      setIsEditingContent(true);
                      setEditTitle(delivery.title);
                      setEditCopywriting(delivery.copywriting);
                    }}
                    className="text-xs px-2.5 py-1 text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors font-medium"
                  >
                    Editar Conteúdo (Gera Nova Versão RF10)
                  </button>
                )}
              </div>

              {/* Edit Content Form (AC07 validation trigger) */}
              {isEditingContent ? (
                <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-lg space-y-4">
                  <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Atenção: alterar o conteúdo gerará uma nova versão (v{delivery.currentVersionNumber + 1}) e invalidará a aprovação atual (RF10, AC07).</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Título da Entrega</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Legenda / Texto da Publicação</label>
                    <textarea
                      rows={5}
                      value={editCopywriting}
                      onChange={(e) => setEditCopywriting(e.target.value)}
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Resumo das alterações para o cliente</label>
                    <input
                      type="text"
                      placeholder="Ex: Ajustada a informação sobre garantia e adicionado novo parágrafo."
                      value={editChangeSummary}
                      onChange={(e) => setEditChangeSummary(e.target.value)}
                      className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsEditingContent(false)}
                      className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveContent}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-xs bg-neutral-900 text-white rounded font-medium hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : 'Salvar Alterações e Criar Nova Versão'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Briefing */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Briefing & Objetivo
                </h4>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-800 leading-relaxed whitespace-pre-line">
                  {displayedVersion.briefing || 'Nenhum briefing especificado.'}
                </div>
              </div>

              {/* Copywriting / Text */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Legenda / Texto da Publicação (Versão v{displayedVersion.versionNumber})
                </h4>
                <div className="p-4 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-900 leading-relaxed whitespace-pre-line font-mono">
                  {displayedVersion.copywriting || '(Texto em redação...)'}
                </div>
              </div>

              {/* Creative Media Preview */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                  Peças Criativas & Mídia
                </h4>
                {displayedVersion.mediaUrls && displayedVersion.mediaUrls.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedVersion.mediaUrls.map((url, i) => (
                      <div key={i} className="border border-neutral-200 rounded-lg overflow-hidden bg-neutral-100">
                        <img
                          src={url}
                          alt={`Mídia ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-56 object-cover"
                        />
                        <div className="p-2 bg-white text-[11px] text-neutral-500 flex justify-between items-center">
                          <span>Arte {i + 1} ({displayedVersion.channel.toUpperCase()})</span>
                          <span className="text-neutral-400">Simulação de feed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-neutral-300 rounded-lg text-center text-xs text-neutral-500">
                    Nenhum arquivo ou arte anexada a esta versão.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: APPROVAL */}
          {activeTab === 'approval' && (
            <div className="space-y-6">
              {/* Client Action Box */}
              {canApprove && (
                <div className="p-5 bg-neutral-900 text-white rounded-xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Painel de Decisão do Cliente</h3>
                      <p className="text-xs text-neutral-300 mt-0.5">
                        Versão em análise: <span className="font-mono font-bold text-white">v{selectedVersionNum}</span>
                        {!isCurrentVersion && ' (ATENÇÃO: Versão desatualizada)'}
                      </p>
                    </div>
                    <ApprovalStatusBadge status={delivery.approvalStatus} />
                  </div>

                  {!isCurrentVersion ? (
                    <div className="p-3 bg-amber-500/20 border border-amber-400 text-amber-200 text-xs rounded">
                      Você está visualizando a versão v{selectedVersionNum}, mas a versão mais recente é a v{delivery.currentVersionNumber}.
                      Para aprovar ou solicitar ajustes, selecione a versão vigente no topo (AC08).
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setDecisionModalType('aprovado');
                          setFeedbackNotes('');
                        }}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aprovar Versão v{selectedVersionNum}</span>
                      </button>

                      <button
                        onClick={() => {
                          setDecisionModalType('ajustes_solicitados');
                          setFeedbackNotes('');
                        }}
                        className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Solicitar Ajustes</span>
                      </button>

                      <button
                        onClick={() => {
                          setDecisionModalType('reprovado');
                          setFeedbackNotes('');
                        }}
                        className="py-2 px-3 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reprovar</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Staff Action: Send for Approval */}
              {isStaff && delivery.approvalStatus !== 'aprovado' && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-sky-900">Disponibilizar no Portal do Cliente</h4>
                    <p className="text-xs text-sky-700">
                      Envia a versão v{delivery.currentVersionNumber} fechada para o cliente aprovar.
                    </p>
                  </div>
                  <button
                    onClick={handleSendApproval}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded text-xs font-medium flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar para Aprovação</span>
                  </button>
                </div>
              )}

              {/* Version Decisions History */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Histórico de Decisões de Todas as Versões
                </h4>
                <div className="space-y-3">
                  {delivery.versions.map(v => (
                    <div key={v.versionNumber} className="p-4 border border-neutral-200 rounded-lg bg-neutral-50/50 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-neutral-900">
                          Versão v{v.versionNumber} {v.versionNumber === delivery.currentVersionNumber ? '(Vigente)' : ''}
                        </span>
                        <span className="text-neutral-500 text-[11px]">
                          Criada por {v.createdByName} em {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {v.decision ? (
                        <div className="mt-2 p-2.5 bg-white border border-neutral-200 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-neutral-800">
                              Decisão: {v.decision.status.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              Decidido por {v.decision.decidedByName} em {new Date(v.decision.decidedAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          {v.decision.feedbackNotes && (
                            <p className="text-neutral-700 mt-1 italic">
                              "{v.decision.feedbackNotes}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-neutral-500 italic text-[11px]">
                          Sem decisão registrada para esta versão.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TASKS (Staff only) */}
          {activeTab === 'tasks' && isStaff && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Checklist e Fila Operacional da Entrega
                </h4>
                <span className="text-xs text-neutral-500 font-mono">
                  {tasks.filter(t => t.completed).length} de {tasks.length} concluídas
                </span>
              </div>

              {/* New Task Form */}
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar nova tarefa interna (ex: Criar arte no Canva, Revisar copy)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 text-xs p-2 border border-neutral-300 rounded bg-white"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-2">
                {tasks.map(t => (
                  <div
                    key={t.id}
                    className={`p-3 border rounded-lg flex items-center justify-between gap-3 text-xs transition-colors ${
                      t.completed ? 'bg-neutral-50 border-neutral-200 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => handleToggleTask(t.id)}
                        className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
                      />
                      <span className={`truncate font-medium ${t.completed ? 'line-through text-neutral-400' : ''}`}>
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.assigneeId ? (
                        <span className="text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded font-medium">
                          {t.assigneeName}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimTask(t.id)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          title="Assumir esta tarefa atômica (testar AC04)"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Assumir Tarefa (Livre)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              {/* New Comment Input */}
              <form onSubmit={handleAddComment} className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                <textarea
                  rows={3}
                  placeholder={
                    isClient 
                      ? 'Escreva seu comentário para a equipe da Commet...' 
                      : (newCommentInternal ? 'Nota interna (visível apenas para a equipe)...' : 'Comentário compartilhado (o cliente verá no portal)...')
                  }
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="w-full text-xs p-2.5 border border-neutral-300 rounded bg-white"
                />

                <div className="flex items-center justify-between">
                  {isStaff ? (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                      <input
                        type="checkbox"
                        checked={newCommentInternal}
                        onChange={(e) => setNewCommentInternal(e.target.checked)}
                        className="w-4 h-4 text-neutral-900 rounded"
                      />
                      <span className="font-medium">
                        {newCommentInternal ? '🔒 Comentário Interno (Oculto do Cliente)' : '🌐 Comentário Compartilhado (Visível no Portal)'}
                      </span>
                    </label>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      Comentário compartilhado com a equipe
                    </span>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 transition-colors"
                  >
                    Enviar Mensagem
                  </button>
                </div>
              </form>

              {/* Comments Thread */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500">
                    Nenhum comentário registrado ainda.
                  </div>
                ) : (
                  comments.map(c => (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                        c.isInternal
                          ? 'bg-amber-50/50 border-amber-200/80 text-amber-950'
                          : 'bg-white border-neutral-200 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{c.authorName}</span>
                          <span className="text-neutral-400">·</span>
                          <span className="text-neutral-500">
                            {c.authorRole === 'admin' ? 'Admin' : c.authorRole === 'employee' ? 'Equipe' : 'Cliente'}
                          </span>
                          {c.isInternal ? (
                            <span className="px-1.5 py-0.2 bg-amber-200/60 text-amber-900 font-semibold rounded text-[10px]">
                              Nota Interna
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 font-semibold rounded text-[10px]">
                              Compartilhado
                            </span>
                          )}
                        </div>
                        <span className="text-neutral-400 font-mono">
                          {new Date(c.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-line">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: PUBLISH & SCHEDULE (Staff only) */}
          {activeTab === 'publish' && isStaff && (
            <div className="space-y-6">
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-neutral-900">Status de Produção Atual</h4>
                <div className="flex items-center gap-3">
                  <ProductionStatusBadge status={delivery.productionStatus} isBlocked={delivery.isBlocked} />
                  <span className="text-xs text-neutral-500">
                    Aprovação atual: <span className="font-semibold text-neutral-900">{delivery.approvalStatus.toUpperCase()}</span>
                  </span>
                </div>
              </div>

              {/* Status Transitions Form with Server Validation */}
              <div className="p-5 border border-neutral-200 rounded-lg bg-white space-y-4">
                <h4 className="text-xs font-bold text-neutral-900">
                  Avançar Estágio de Produção (Regras RF09, AC09, AC12)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleTransitionStatus('pronto_para_publicar')}
                    className="p-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-left transition-colors"
                  >
                    <div className="font-bold text-xs text-emerald-900">Pronto para Publicar</div>
                    <div className="text-[11px] text-emerald-700 mt-1">
                      Exige aprovação válida do cliente (AC09).
                    </div>
                  </button>

                  <button
                    onClick={() => handleTransitionStatus('agendado')}
                    className="p-3 border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 rounded-lg text-left transition-colors"
                  >
                    <div className="font-bold text-xs text-cyan-900">Agendar na Rede</div>
                    <div className="text-[11px] text-cyan-700 mt-1">
                      Registra agendamento manual na ferramenta externa.
                    </div>
                  </button>

                  <button
                    onClick={() => handleTransitionStatus('publicado')}
                    className="p-3 border border-emerald-300 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-left transition-colors"
                  >
                    <div className="font-bold text-xs text-emerald-950">Marcar como Publicado</div>
                    <div className="text-[11px] text-emerald-800 mt-1">
                      Exige data real e link/evidência (AC12).
                    </div>
                  </button>
                </div>

                {/* Evidence fields for AC12 */}
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                  <div className="text-xs font-semibold text-neutral-800">
                    Dados de Comprovação de Publicação (AC12):
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1">Data e Hora Real de Publicação</label>
                      <input
                        type="datetime-local"
                        value={publishDate}
                        onChange={(e) => setPublishDate(e.target.value)}
                        className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1">Link ou Evidência de Publicação</label>
                      <input
                        type="text"
                        placeholder="https://instagram.com/p/exemplo ou print link"
                        value={publishProof}
                        onChange={(e) => setPublishProof(e.target.value)}
                        className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Impediment toggle */}
                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">Sinalizar Impedimento / Bloqueio</div>
                    <div className="text-[11px] text-neutral-500">
                      Sinalizador independente que não substitui o estágio de produção.
                    </div>
                  </div>
                  <button
                    onClick={() => setIsBlocking(!isBlocking)}
                    className="px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-800 rounded text-xs font-medium hover:bg-amber-100"
                  >
                    {delivery.isBlocked ? 'Remover Impedimento' : 'Adicionar Impedimento'}
                  </button>
                </div>

                {isBlocking && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <label className="block text-xs font-semibold text-amber-900">Motivo do Impedimento:</label>
                    <input
                      type="text"
                      placeholder="Ex: Aguardando envio das fotos em alta resolução pelo cliente..."
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full text-xs p-2 border border-amber-300 rounded bg-white"
                    />
                    <button
                      onClick={handleToggleBlock}
                      className="px-3 py-1 bg-amber-700 text-white rounded text-xs font-medium hover:bg-amber-800"
                    >
                      Confirmar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: AUDIT & HISTORY */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Linha do Tempo e Trilha de Auditoria (RF23)
              </h4>
              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 bg-white">
                {auditLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500">
                    Nenhum registro de auditoria disponível.
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="p-3 text-xs flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-neutral-900">{log.action}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Por <span className="font-semibold">{log.userName}</span> ({log.userRole})
                        </div>
                      </div>
                      <div className="text-neutral-400 font-mono text-[11px] shrink-0">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
          <div className="font-mono">
            ID: {delivery.id} · Canal: {delivery.channel.toUpperCase()}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Decision Feedback Modal (Required reason for ajustes_solicitados or reprovado - AC10) */}
      {decisionModalType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <h3 className="text-base font-bold text-neutral-900">
              {decisionModalType === 'aprovado' 
                ? 'Confirmar Aprovação da Versão v' + selectedVersionNum
                : decisionModalType === 'ajustes_solicitados' 
                ? 'Solicitar Ajustes na Versão v' + selectedVersionNum
                : 'Reprovar Entrega'}
            </h3>

            {decisionModalType !== 'aprovado' ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Justificativa Obrigatória (AC10):
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva exatamente o que precisa ser ajustado pela equipe..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-neutral-300 rounded bg-white"
                  required
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  A equipe da Commet receberá uma notificação imediata com esta justificativa.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Comentários ou observações (opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Aprovado sem ressalvas!"
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionModalType(null)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDecisionSubmit}
                disabled={isSubmitting || ((decisionModalType === 'ajustes_solicitados' || decisionModalType === 'reprovado') && !feedbackNotes.trim())}
                className={`px-4 py-2 text-xs font-semibold rounded text-white transition-colors disabled:opacity-50 ${
                  decisionModalType === 'aprovado'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decisionModalType === 'ajustes_solicitados'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmitting ? 'Registrando...' : 'Confirmar Decisão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
