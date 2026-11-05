import { ClientName, useClientName } from '../../contexts/ClientsContext';
import React, { useState } from 'react';
import { Delivery, ProductionStatus } from '../../types';
import { ProductionStatusBadge, ApprovalStatusBadge, ChannelIcon } from '../common/StatusBadge';
import { Calendar, User, MoreVertical, AlertTriangle, Eye, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DeliveryCardProps {
  delivery: Delivery;
  onOpenDetails: (delivery: Delivery) => void;
  onTransitionStatus?: (deliveryId: string, targetStatus: ProductionStatus) => void;
  compact?: boolean;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onOpenDetails,
  onTransitionStatus,
  compact = false
}) => {
  const { isStaff } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const clientName = useClientName(delivery.clientId);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Sem data';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const handleStatusChange = (status: ProductionStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onTransitionStatus) {
      onTransitionStatus(delivery.id, status);
    }
  };

  return (
    <div
      onClick={() => onOpenDetails(delivery)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetails(delivery);
        }
      }}
      className={`group relative bg-white border border-neutral-200 rounded-lg p-3 hover:border-neutral-300 hover:shadow-sm transition-all text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none ${
        delivery.isBlocked ? 'border-amber-300 bg-amber-50/20' : ''
      }`}
    >
      {/* Top row: Client, Channel, Version & Menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ChannelIcon channel={delivery.channel} className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-semibold text-neutral-800 truncate">
            {clientName}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-1 py-0.2 rounded shrink-0">
            v{delivery.currentVersionNumber}
          </span>
          {delivery.visibility === 'internal' && (
            <span className="text-[10px] text-neutral-500 flex items-center gap-0.5 bg-neutral-100 px-1 rounded shrink-0" title="Rascunho interno da equipe (não compartilhado no portal)">
              <Lock className="w-2.5 h-2.5" />
              <span>Rascunho</span>
            </span>
          )}
        </div>

        {/* Accessible status change menu (AC16) */}
        {isStaff && onTransitionStatus && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
              title="Ações e mudança de status rápida"
              aria-label="Abrir menu de mudança de status"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-40 text-xs">
                  <div className="px-3 py-1 font-semibold text-neutral-500 border-b border-neutral-100">
                    Mover estágio:
                  </div>
                  <button
                    onClick={(e) => handleStatusChange('nao_iniciado', e)}
                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-neutral-700"
                  >
                    Não iniciado
                  </button>
                  <button
                    onClick={(e) => handleStatusChange('em_producao', e)}
                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-blue-700 font-medium"
                  >
                    Em produção
                  </button>
                  <button
                    onClick={(e) => handleStatusChange('revisao_interna', e)}
                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-purple-700 font-medium"
                  >
                    Revisão interna
                  </button>
                  <button
                    onClick={(e) => handleStatusChange('pronto_para_publicar', e)}
                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-emerald-700 font-medium"
                  >
                    Pronto para publicar
                  </button>
                  <button
                    onClick={(e) => handleStatusChange('agendado', e)}
                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-cyan-700 font-medium"
                  >
                    Agendado
                  </button>
                  <button
                    onClick={(e) => handleStatusChange('publicado', e)}
                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-50 text-emerald-900 font-bold"
                  >
                    Publicado
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-neutral-900 mb-2 line-clamp-2 leading-snug">
        {delivery.title}
      </h4>

      {/* Blocked reason banner */}
      {delivery.isBlocked && delivery.blockedReason && (
        <div className="mb-2 p-1.5 bg-amber-50 border border-amber-200/80 rounded text-[11px] text-amber-800 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{delivery.blockedReason}</span>
        </div>
      )}

      {/* Thumbnail preview if available */}
      {delivery.mediaUrls && delivery.mediaUrls.length > 0 && (
        <div className="mb-2 rounded overflow-hidden h-20 bg-neutral-100 border border-neutral-200">
          <img
            src={delivery.mediaUrls[0]}
            alt={delivery.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Approval badge row */}
      <div className="mb-2.5">
        <ApprovalStatusBadge status={delivery.approvalStatus} />
      </div>

      {/* Footer: Date, Assignee */}
      <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
        <div className="flex items-center gap-1 font-mono text-[11px]" title="Data prevista de publicação">
          <Calendar className="w-3 h-3 text-neutral-400" />
          <span>{formatDate(delivery.scheduledPublicationDate)}</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] truncate max-w-[120px]" title={`Responsável: ${delivery.primaryAssigneeName}`}>
          <User className="w-3 h-3 text-neutral-400 shrink-0" />
          <span className="truncate">{delivery.primaryAssigneeName.split(' ')[0]}</span>
        </div>
      </div>
    </div>
  );
};
