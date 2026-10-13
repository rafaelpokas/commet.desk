import { ClientName, useClientName } from '../../contexts/ClientsContext';
import React, { useState, useEffect } from 'react';
import { ClientRequest, Channel, DeliveryPriority, Client } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Inbox, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Filter, 
  X,
  FileText
} from 'lucide-react';
import { ChannelIcon } from '../common/StatusBadge';

interface RequestsManagerProps {
  onDeliveryCreated?: () => void;
}

export const RequestsManager: React.FC<RequestsManagerProps> = ({ onDeliveryCreated }) => {
  const { user, isStaff, isAdmin, isClient } = useAuth();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // New request modal
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newChannel, setNewChannel] = useState<Channel>('instagram');
  const [newDesiredDate, setNewDesiredDate] = useState('');
  const [newPriority, setNewPriority] = useState<DeliveryPriority>('media');
  const [newClientId, setNewClientId] = useState('');

  // Triage state
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const [triageStatus, setTriageStatus] = useState<string>('em_triagem');
  const [triageOutOfScope, setTriageOutOfScope] = useState<boolean>(false);
  const [triageNotes, setTriageNotes] = useState<string>('');

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.all([
        api.getRequests(),
        isStaff ? api.getClients() : Promise.resolve({ clients: [] })
      ]);
      setRequests(rRes.requests);
      setClients(cRes.clients);
      if (cRes.clients.length > 0 && !newClientId) {
        setNewClientId(cRes.clients[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    try {
      const res = await api.createRequest({
        title: newTitle,
        description: newDescription,
        channel: newChannel,
        desiredDate: newDesiredDate || undefined,
        suggestedPriority: newPriority,
        clientId: isClient ? user?.clientId : newClientId
      });
      setMessage(res.message);
      setIsCreating(false);
      setNewTitle('');
      setNewDescription('');
      await fetchRequests();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao enviar solicitação');
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedRequest) return;
    setErrorMessage(null);
    setMessage(null);

    try {
      const res = await api.reviewRequest(selectedRequest.id, {
        status: triageStatus,
        isOutOfScope: triageOutOfScope,
        reviewNotes: triageNotes
      });
      setMessage(res.message);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao revisar solicitação');
    }
  };

  const handleAdminAccept = async (requestId: string) => {
    setErrorMessage(null);
    setMessage(null);

    try {
      const res = await api.adminAcceptRequest(requestId);
      setMessage(res.message);
      await fetchRequests();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro na autorização do administrador');
    }
  };

  const handleConvert = async (requestId: string) => {
    setErrorMessage(null);
    setMessage(null);

    try {
      const res = await api.convertRequest(requestId);
      setMessage(res.message);
      await fetchRequests();
      if (onDeliveryCreated) onDeliveryCreated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao converter solicitação em entrega (AC15)');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 space-y-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Solicitações de Clientes (RF17, AC15)
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Canal oficial para envio de novas necessidades, triagem da equipe e conversão em entregas contratuais com controle de escopo.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isClient ? 'Nova Solicitação' : 'Registrar Solicitação'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 font-semibold hover:underline">Fechar</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-semibold hover:underline">Fechar</button>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-900">Solicitações Registradas ({requests.length})</h3>
        </div>

        <div className="divide-y divide-neutral-100">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              Nenhuma solicitação encontrada.
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="p-4 hover:bg-neutral-50/50 transition-colors text-xs space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {req.channel && <ChannelIcon channel={req.channel} className="w-3.5 h-3.5" />}
                      <span className="font-semibold text-neutral-800">
                        <ClientName id={req.clientId}/>
                      </span>
                      <span className="text-neutral-300">·</span>
                      <span className="text-[11px] text-neutral-500">
                        Por {req.submittedByName} em {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                      </span>

                      {/* Status Badges */}
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
                        {req.status}
                      </span>

                      {req.isOutOfScope && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          Fora do Escopo (AC15)
                        </span>
                      )}

                      {req.isOutOfScope && req.adminAccepted && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Aceito pelo Admin
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-neutral-900">{req.title}</h4>
                    <p className="text-neutral-600 mt-1 leading-relaxed">{req.description}</p>
                    {req.reviewNotes && (
                      <div className="mt-2 p-2 bg-neutral-100 rounded text-[11px] text-neutral-700 italic">
                        Nota da Equipe: "{req.reviewNotes}"
                      </div>
                    )}
                  </div>

                  {/* Actions for Staff */}
                  {isStaff && req.status !== 'convertida' && (
                    <div className="flex flex-col gap-1.5 shrink-0 items-end">
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setTriageStatus(req.status);
                          setTriageOutOfScope(req.isOutOfScope);
                          setTriageNotes(req.reviewNotes || '');
                        }}
                        className="px-3 py-1.5 border border-neutral-300 bg-white hover:bg-neutral-50 rounded text-neutral-800 font-medium text-xs transition-colors"
                      >
                        Triagem / Classificar
                      </button>

                      {isAdmin && req.isOutOfScope && !req.adminAccepted && (
                        <button
                          onClick={() => handleAdminAccept(req.id)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-xs transition-colors flex items-center gap-1"
                          title="Aceitar demanda extra fora do escopo (AC15)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Aceitar Extra (Admin AC15)</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleConvert(req.id)}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded font-medium text-xs transition-colors flex items-center gap-1"
                        title="Converter em entrega contratual de marketing"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Converter em Entrega</span>
                      </button>
                    </div>
                  )}

                  {req.status === 'convertida' && (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded text-xs shrink-0">
                      ✓ Convertida em Entrega
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">Nova Solicitação de Marketing</h3>
              <button onClick={() => setIsCreating(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              {isStaff && (
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">Cliente Solicitante</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded bg-white"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-neutral-700 font-medium mb-1">Título da Necessidade</label>
                <input
                  type="text"
                  placeholder="Ex: Post de divulgação do novo produto..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-medium mb-1">Descrição / Briefing da Demanda</label>
                <textarea
                  rows={4}
                  placeholder="Explique o que precisa ser comunicado, público-alvo, referências..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">Canal Sugerido</label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value as any)}
                    className="w-full p-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-medium mb-1">Data Desejada</label>
                  <input
                    type="date"
                    value={newDesiredDate}
                    onChange={(e) => setNewDesiredDate(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800"
                >
                  Enviar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Triage / Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900">
              Triagem de Solicitação (RF17)
            </h3>
            <p className="text-xs text-neutral-600">
              Classifique a demanda e defina se ela faz parte da cota contratada ou se é extra.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-medium mb-1">Status da Triagem</label>
                <select
                  value={triageStatus}
                  onChange={(e) => setTriageStatus(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                >
                  <option value="recebida">Recebida</option>
                  <option value="em_triagem">Em triagem</option>
                  <option value="aceita">Aceita</option>
                  <option value="nao_aceita">Não aceita</option>
                </select>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={triageOutOfScope}
                    onChange={(e) => setTriageOutOfScope(e.target.checked)}
                    className="w-4 h-4 text-neutral-900 rounded"
                  />
                  <span>Demanda FORA DO ESCOPO Contratado (AC15)</span>
                </label>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Se marcada como fora de escopo, exigirá aceite explícito do Administrador antes de gerar entrega.
                </p>
              </div>

              <div>
                <label className="block text-neutral-700 font-medium mb-1">Parecer da Equipe / Justificativa</label>
                <textarea
                  rows={3}
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Observações sobre prazo, cota ou orçamento..."
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-3 py-1.5 text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReviewSubmit}
                  className="px-4 py-2 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800"
                >
                  Salvar Triagem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
