import React from 'react';
import { ProductionStatus, ApprovalStatus, Channel, DeliveryPriority } from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileEdit, 
  Send, 
  CalendarCheck, 
  CheckCheck, 
  XCircle, 
  RotateCcw,
  Instagram,
  Linkedin,
  Video,
  Share2
} from 'lucide-react';

interface ProductionBadgeProps {
  status: ProductionStatus;
  isBlocked?: boolean;
}

export const ProductionStatusBadge: React.FC<ProductionBadgeProps> = ({ status, isBlocked }) => {
  if (isBlocked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>Impedido</span>
      </span>
    );
  }

  switch (status) {
    case 'nao_iniciado':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
          <Clock className="w-3.5 h-3.5 text-neutral-500" />
          <span>Não iniciado</span>
        </span>
      );
    case 'em_producao':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded">
          <FileEdit className="w-3.5 h-3.5 text-blue-600" />
          <span>Em produção</span>
        </span>
      );
    case 'revisao_interna':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded">
          <Send className="w-3.5 h-3.5 text-purple-600" />
          <span>Revisão interna</span>
        </span>
      );
    case 'pronto_para_publicar':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pronto p/ publicar</span>
        </span>
      );
    case 'agendado':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded">
          <CalendarCheck className="w-3.5 h-3.5 text-cyan-600" />
          <span>Agendado na rede</span>
        </span>
      );
    case 'publicado':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Publicado</span>
        </span>
      );
    case 'cancelado':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded line-through">
          <XCircle className="w-3.5 h-3.5 text-neutral-400" />
          <span>Cancelado</span>
        </span>
      );
  }
};

export const ApprovalStatusBadge: React.FC<{ status: ApprovalStatus }> = ({ status }) => {
  switch (status) {
    case 'nao_solicitado':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
          <Clock className="w-3 h-3 text-neutral-400" />
          <span>Aprovação: Não solicitada</span>
        </span>
      );
    case 'aguardando_aprovacao':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50/80 border border-amber-200/70 px-2 py-0.5 rounded">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          <span>Aguardando cliente</span>
        </span>
      );
    case 'aprovado':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/70 px-2 py-0.5 rounded">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Aprovado</span>
        </span>
      );
    case 'ajustes_solicitados':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50/80 border border-orange-200/70 px-2 py-0.5 rounded">
          <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
          <span>Ajustes solicitados</span>
        </span>
      );
    case 'reprovado':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50/80 border border-rose-200/70 px-2 py-0.5 rounded">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Reprovado</span>
        </span>
      );
  }
};

export const ChannelIcon: React.FC<{ channel: Channel; className?: string }> = ({ channel, className = 'w-4 h-4' }) => {
  switch (channel) {
    case 'instagram':
      return <Instagram className={`${className} text-pink-600`} />;
    case 'linkedin':
      return <Linkedin className={`${className} text-sky-700`} />;
    case 'tiktok':
      return <Video className={`${className} text-neutral-900`} />;
    case 'youtube':
      return <Video className={`${className} text-red-600`} />;
    default:
      return <Share2 className={`${className} text-neutral-600`} />;
  }
};

export const PriorityIndicator: React.FC<{ priority: DeliveryPriority }> = ({ priority }) => {
  switch (priority) {
    case 'urgente':
      return <span className="text-xs font-medium text-rose-700">Urgente</span>;
    case 'alta':
      return <span className="text-xs font-medium text-amber-700">Alta</span>;
    case 'media':
      return <span className="text-xs text-neutral-600">Média</span>;
    case 'baixa':
      return <span className="text-xs text-neutral-500">Baixa</span>;
  }
};
