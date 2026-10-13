import React, { useState } from 'react';
import { Delivery, Client, ProductionStatus } from '../../types';
import { ChannelIcon, ProductionStatusBadge, ApprovalStatusBadge, PriorityIndicator } from '../common/StatusBadge';
import { Calendar, User, Search, AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DeliveriesListViewProps {
  deliveries: Delivery[];
  clients: Client[];
  onOpenDetails: (delivery: Delivery) => void;
  onTransitionStatus: (deliveryId: string, status: ProductionStatus) => void;
}

export const DeliveriesListView: React.FC<DeliveriesListViewProps> = ({
  deliveries,
  clients,
  onOpenDetails,
  onTransitionStatus
}) => {
  const { isStaff } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = deliveries.filter(d => {
    if (statusFilter !== 'all' && d.productionStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!d.title.toLowerCase().includes(q) && !d.copywriting.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Filter toolbar */}
      <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Filtrar por título ou legenda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs p-1.5 border border-neutral-300 rounded bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 border border-neutral-300 rounded bg-white"
          >
            <option value="all">Todos os Status</option>
            <option value="nao_iniciado">Não iniciado</option>
            <option value="em_producao">Em produção</option>
            <option value="revisao_interna">Revisão interna</option>
            <option value="pronto_para_publicar">Pronto p/ publicar</option>
            <option value="agendado">Agendado</option>
            <option value="publicado">Publicado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200 sticky top-0 z-10">
            <tr>
              <th className="p-3">Título da Entrega</th>
              <th className="p-3">Canal</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Versão</th>
              <th className="p-3">Produção</th>
              <th className="p-3">Aprovação</th>
              <th className="p-3">Responsável</th>
              <th className="p-3">Publicação Prevista</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-neutral-400">
                  Nenhuma entrega encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filtered.map(d => (
                <tr
                  key={d.id}
                  onClick={() => onOpenDetails(d)}
                  className="hover:bg-neutral-50/80 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-medium text-neutral-900 max-w-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      {d.isBlocked && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      {d.visibility === 'internal' && <Lock className="w-3 h-3 text-neutral-400 shrink-0" />}
                      <span className="truncate">{d.title}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 font-semibold text-neutral-700 capitalize">
                      <ChannelIcon channel={d.channel} className="w-3.5 h-3.5" />
                      <span>{d.channel}</span>
                    </div>
                  </td>
                  <td className="p-3 text-neutral-600">
                    {d.clientId === 'cli_solartech' ? 'SolarTech' : 'Nexa Log'}
                  </td>
                  <td className="p-3 font-mono font-semibold text-neutral-500">
                    v{d.currentVersionNumber}
                  </td>
                  <td className="p-3">
                    <ProductionStatusBadge status={d.productionStatus} isBlocked={d.isBlocked} />
                  </td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={d.approvalStatus} />
                  </td>
                  <td className="p-3 text-neutral-700 font-medium">
                    {d.primaryAssigneeName}
                  </td>
                  <td className="p-3 font-mono text-neutral-600">
                    {d.scheduledPublicationDate ? new Date(d.scheduledPublicationDate).toLocaleDateString('pt-BR') : 'Sem data'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
