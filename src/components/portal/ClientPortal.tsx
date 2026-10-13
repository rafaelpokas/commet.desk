import React, { useState } from 'react';
import { Delivery, Client } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { DeliveryCard } from '../deliveries/DeliveryCard';
import { 
  CheckCircle2, 
  Clock, 
  Send, 
  FolderOpen, 
  Calendar, 
  Sparkles,
  AlertCircle,
  Eye,
  Check,
  RotateCcw
} from 'lucide-react';

interface ClientPortalProps {
  deliveries: Delivery[];
  client: Client | null;
  onOpenDetails: (delivery: Delivery) => void;
  onRequestDemand: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  deliveries,
  client,
  onOpenDetails,
  onRequestDemand
}) => {
  const { user, canApprove } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all' | 'brand'>('pending');

  const pendingApprovals = deliveries.filter(d => d.approvalStatus === 'aguardando_aprovacao');
  const approvedDeliveries = deliveries.filter(d => d.approvalStatus === 'aprovado');
  const inProductionDeliveries = deliveries.filter(d => d.productionStatus === 'em_producao' || d.productionStatus === 'nao_iniciado');

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Portal do Cliente · {client?.tradeName || client?.name}
          </span>
          <h1 className="text-xl font-bold text-neutral-900 mt-1">
            Olá, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-xs text-neutral-600 mt-1 max-w-xl">
            Acompanhe o planejamento de marketing da sua empresa, revise as peças criadas pela equipe da Commet e aprove as publicações diretamente pelo portal.
          </p>
        </div>

        <button
          onClick={onRequestDemand}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Solicitar Nova Demanda</span>
        </button>
      </div>

      {/* Priority: Pending Approvals Alert Strip */}
      {pendingApprovals.length > 0 ? (
        <div className="bg-amber-500/10 border border-amber-300 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                {pendingApprovals.length}
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  {pendingApprovals.length === 1 ? '1 Entrega Aguardando Sua Aprovação' : `${pendingApprovals.length} Entregas Aguardando Sua Aprovação`}
                </h3>
                <p className="text-xs text-amber-800">
                  {canApprove 
                    ? 'Clique na entrega para revisar o texto, a arte e confirmar a aprovação.'
                    : 'Você possui permissão de consulta. Apenas o aprovador designado pode tomar a decisão.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingApprovals.map(d => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Parabéns! Nenhuma entrega pendente de aprovação no momento. Todas as versões enviadas estão validadas.</span>
        </div>
      )}

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium">Aguardando Aprovação</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1 tabular-nums">
            {pendingApprovals.length}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium">Aprovadas no Mês</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">
            {approvedDeliveries.length}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium">Em Produção</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1 tabular-nums">
            {inProductionDeliveries.length}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium">Total Compartilhado</div>
          <div className="text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
            {deliveries.length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 text-xs font-semibold">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedTab === 'pending' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Aprovações Pendentes ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedTab === 'all' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Todas as Entregas ({deliveries.length})
          </button>
          <button
            onClick={() => setSelectedTab('brand')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedTab === 'brand' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Brand Kit & Diretrizes
          </button>
        </div>

        {selectedTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveries.map(d => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </div>
        )}

        {selectedTab === 'pending' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingApprovals.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-neutral-400">
                Nenhuma entrega pendente de aprovação.
              </div>
            ) : (
              pendingApprovals.map(d => (
                <DeliveryCard
                  key={d.id}
                  delivery={d}
                  onOpenDetails={onOpenDetails}
                />
              ))
            )}
          </div>
        )}

        {selectedTab === 'brand' && client && (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">
              Diretrizes de Marca da {client.name} (RF19)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-neutral-50 rounded-lg space-y-2 border border-neutral-200">
                <span className="font-semibold text-neutral-700">Paleta Oficial:</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded border border-neutral-300"
                      style={{ backgroundColor: client.brandKit.primaryColor || 'transparent' }}
                    />
                    <span className="font-mono">{client.brandKit.primaryColor || 'A confirmar'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded border border-neutral-300"
                      style={{ backgroundColor: client.brandKit.secondaryColor || 'transparent' }}
                    />
                    <span className="font-mono">{client.brandKit.secondaryColor || 'A confirmar'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 rounded-lg space-y-2 border border-neutral-200">
                <span className="font-semibold text-neutral-700">Tipografia de Referência:</span>
                <div className="font-mono text-neutral-800">
                  {client.brandKit.fonts?.join(', ') || 'A confirmar pelo brandbook'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
              <span className="font-semibold text-neutral-700 block mb-1">Orientações de Tom de Voz:</span>
              <p className="text-neutral-600 leading-relaxed">
                {client.brandKit.guidelinesNotes || 'Comunicação estratégica de alta qualidade.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
