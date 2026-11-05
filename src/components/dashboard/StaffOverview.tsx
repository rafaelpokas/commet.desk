import React from 'react';
import { Delivery, Client } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { DeliveryCard } from '../deliveries/DeliveryCard';
import { 
  CheckCircle2, 
  Clock, 
  Send, 
  Calendar, 
  Plus, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface StaffOverviewProps {
  deliveries: Delivery[];
  clients: Client[];
  onOpenDetails: (delivery: Delivery) => void;
  onNavigateTab: (tab: any) => void;
  onCreateDelivery: () => void;
}

export const StaffOverview: React.FC<StaffOverviewProps> = ({
  deliveries,
  clients,
  onOpenDetails,
  onNavigateTab,
  onCreateDelivery
}) => {
  const { user, isAdmin } = useAuth();

  const pendingApprovals = deliveries.filter(d => d.approvalStatus === 'aguardando_aprovacao');
  const blockedDeliveries = deliveries.filter(d => d.isBlocked);
  const inProduction = deliveries.filter(d => d.productionStatus === 'em_producao' || d.productionStatus === 'revisao_interna');
  const publishedCount = deliveries.filter(d => d.productionStatus === 'publicado').length;

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 space-y-6">
      {/* Welcome banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Painel Operacional Commet
          </span>
          <h1 className="text-xl font-bold text-neutral-900 mt-1">
            Olá, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-xs text-neutral-600 mt-1 max-w-xl">
            Gestão unificada de clientes, obrigações mensais de marketing, kanban e aprovações com o cliente em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('brand-kit')}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Identidade & referências</span>
          </button>

          <button
            onClick={onCreateDelivery}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Entrega</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('kanban')}
          className="bg-white border border-neutral-200 rounded-xl p-4 cursor-pointer hover:border-neutral-300 transition-colors shadow-2xs"
        >
          <div className="text-xs text-neutral-500 font-medium">Em Produção / Revisão</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1 tabular-nums">
            {inProduction.length}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
            <span>Ver no Kanban</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('kanban')}
          className="bg-white border border-neutral-200 rounded-xl p-4 cursor-pointer hover:border-neutral-300 transition-colors shadow-2xs"
        >
          <div className="text-xs text-neutral-500 font-medium">Aguardando Cliente</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1 tabular-nums">
            {pendingApprovals.length}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
            <span>Aprovações pendentes</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('kanban')}
          className="bg-white border border-neutral-200 rounded-xl p-4 cursor-pointer hover:border-neutral-300 transition-colors shadow-2xs"
        >
          <div className="text-xs text-neutral-500 font-medium">Publicadas</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">
            {publishedCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
            <span>Comprovadas na rede</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('kanban')}
          className="bg-white border border-neutral-200 rounded-xl p-4 cursor-pointer hover:border-neutral-300 transition-colors shadow-2xs"
        >
          <div className="text-xs text-neutral-500 font-medium">Impedimentos / Travadas</div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1 tabular-nums">
            {blockedDeliveries.length}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
            <span>Requer atenção</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Blocked Deliveries Alert Strip if any */}
      {blockedDeliveries.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Entregas com Impedimento Registrado ({blockedDeliveries.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blockedDeliveries.map(d => (
              <div
                key={d.id}
                onClick={() => onOpenDetails(d)}
                className="p-3 bg-white border border-amber-200 rounded-lg text-xs cursor-pointer hover:border-amber-400"
              >
                <div className="font-semibold text-neutral-900 truncate">{d.title}</div>
                <div className="text-[11px] text-amber-800 mt-1 italic">
                  Motivo: {d.blockedReason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview by Client Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Resumo por Cliente da Carteira</h3>
          <span className="text-xs text-neutral-500">{clients.length} clientes ativos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map(client => {
            const clientDeliveries = deliveries.filter(d => d.clientId === client.id);
            const clientPending = clientDeliveries.filter(d => d.approvalStatus === 'aguardando_aprovacao');
            const clientPublished = clientDeliveries.filter(d => d.productionStatus === 'publicado');

            return (
              <div key={client.id} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-neutral-900">{client.name}</h4>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      Canais: {client.channels.join(', ').toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigateTab('kanban')}
                    className="text-xs text-neutral-700 hover:text-neutral-900 font-medium px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200"
                  >
                    Abrir Quadro
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-neutral-100">
                  <div className="p-2 bg-neutral-50 rounded">
                    <span className="text-neutral-500 block text-[11px]">Entregas</span>
                    <span className="font-bold font-mono text-neutral-900">{clientDeliveries.length}</span>
                  </div>
                  <div className="p-2 bg-amber-50/60 rounded">
                    <span className="text-amber-800 block text-[11px]">Em Aprovação</span>
                    <span className="font-bold font-mono text-amber-900">{clientPending.length}</span>
                  </div>
                  <div className="p-2 bg-emerald-50/60 rounded">
                    <span className="text-emerald-800 block text-[11px]">Publicadas</span>
                    <span className="font-bold font-mono text-emerald-900">{clientPublished.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
