import React, { useState } from 'react';
import { Delivery, ProductionStatus, Channel, Client } from '../../types';
import { DeliveryCard } from '../deliveries/DeliveryCard';
import { 
  Filter, 
  Plus, 
  Search, 
  AlertTriangle, 
  Clock, 
  Send, 
  CheckCircle2, 
  CalendarCheck, 
  CheckCheck,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface KanbanBoardProps {
  deliveries: Delivery[];
  clients: Client[];
  onOpenDetails: (delivery: Delivery) => void;
  onTransitionStatus: (deliveryId: string, status: ProductionStatus) => void;
  onCreateDelivery: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  deliveries,
  clients,
  onOpenDetails,
  onTransitionStatus,
  onCreateDelivery
}) => {
  const { isStaff } = useAuth();

  // Filters
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [filterBlockedOnly, setFilterBlockedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredDeliveries = deliveries.filter(d => {
    if (selectedClient !== 'all' && d.clientId !== selectedClient) return false;
    if (selectedChannel !== 'all' && d.channel !== selectedChannel) return false;
    if (selectedPriority !== 'all' && d.priority !== selectedPriority) return false;
    if (filterBlockedOnly && !d.isBlocked) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!d.title.toLowerCase().includes(q) && !d.copywriting.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const columns: { status: ProductionStatus; title: string; icon: React.ReactNode; color: string }[] = [
    {
      status: 'nao_iniciado',
      title: 'Não Iniciado',
      icon: <Clock className="w-3.5 h-3.5 text-neutral-500" />,
      color: 'bg-neutral-100/70 border-neutral-200'
    },
    {
      status: 'em_producao',
      title: 'Em Produção',
      icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
      color: 'bg-blue-50/40 border-blue-200'
    },
    {
      status: 'revisao_interna',
      title: 'Revisão Interna',
      icon: <Send className="w-3.5 h-3.5 text-purple-500" />,
      color: 'bg-purple-50/40 border-purple-200'
    },
    {
      status: 'pronto_para_publicar',
      title: 'Pronto p/ Publicar',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
      color: 'bg-emerald-50/40 border-emerald-200'
    },
    {
      status: 'agendado',
      title: 'Agendado na Rede',
      icon: <CalendarCheck className="w-3.5 h-3.5 text-cyan-500" />,
      color: 'bg-cyan-50/40 border-cyan-200'
    },
    {
      status: 'publicado',
      title: 'Publicado',
      icon: <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />,
      color: 'bg-emerald-100/50 border-emerald-300'
    }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-50">
      {/* Filter and action toolbar */}
      <div className="p-4 bg-white border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar demandas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Client Filter (staff only) */}
          {isStaff && clients.length > 1 && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Channel Filter */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white"
          >
            <option value="all">Todos os Canais</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>

          {/* Priority */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          {/* Blocked Only Toggle */}
          <button
            onClick={() => setFilterBlockedOnly(!filterBlockedOnly)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium transition-colors ${
              filterBlockedOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Impedidos</span>
          </button>
        </div>

        {/* Action Button */}
        {isStaff && (
          <button
            onClick={onCreateDelivery}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Entrega</span>
          </button>
        )}
      </div>

      {/* Board Columns Grid */}
      <div className="flex-1 overflow-x-auto p-4 min-h-0">
        <div className="flex gap-4 min-w-[1300px] h-full items-start">
          {columns.map(col => {
            const colDeliveries = filteredDeliveries.filter(d => d.productionStatus === col.status);

            return (
              <div
                key={col.status}
                className="w-72 flex flex-col bg-white rounded-xl border border-neutral-200/90 shadow-2xs max-h-full shrink-0"
              >
                {/* Column Header */}
                <div className={`p-3 border-b rounded-t-xl flex items-center justify-between ${col.color}`}>
                  <div className="flex items-center gap-2">
                    {col.icon}
                    <h3 className="text-xs font-bold text-neutral-900">{col.title}</h3>
                  </div>
                  <span className="text-xs font-mono font-semibold text-neutral-600 bg-white/80 px-1.5 py-0.2 rounded border border-neutral-200">
                    {colDeliveries.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[400px]">
                  {colDeliveries.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400 italic">
                      Nenhuma entrega neste estágio
                    </div>
                  ) : (
                    colDeliveries.map(delivery => (
                      <DeliveryCard
                        key={delivery.id}
                        delivery={delivery}
                        onOpenDetails={onOpenDetails}
                        onTransitionStatus={onTransitionStatus}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
