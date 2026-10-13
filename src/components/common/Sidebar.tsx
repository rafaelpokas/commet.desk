import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  Kanban,
  Calendar,
  ListOrdered,
  Inbox,
  BarChart3,
  Settings,
  ShieldCheck,
  FolderOpen,
  Send,
  Building
} from 'lucide-react';

export type ActiveTab = 
  | 'overview'
  | 'my-tasks'
  | 'kanban'
  | 'calendar'
  | 'list'
  | 'requests'
  | 'metrics'
  | 'admin'
  | 'approvals'
  | 'brand-kit'
  | 'testing';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingApprovalsCount?: number;
  openRequestsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  openRequestsCount = 0
}) => {
  const { user, isStaff, isAdmin, isClient } = useAuth();

  return (
    <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col shrink-0">
      <div className="p-4 border-b border-neutral-100">
        <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">
          {isClient ? 'Portal do Cliente' : 'Operação Interna'}
        </div>
        <div className="text-sm font-semibold text-neutral-900 truncate">
          {isClient ? (user?.clientId === 'cli_solartech' ? 'SolarTech Brasil' : 'Nexa Logística') : 'Agência Commet'}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-sm">
        {/* CLIENT NAVIGATION */}
        {isClient && (
          <>
            <button
              onClick={() => onSelectTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'overview' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => onSelectTab('approvals')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'approvals' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className="w-4 h-4 shrink-0" />
                <span>Aprovações</span>
              </div>
              {pendingApprovalsCount > 0 && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('calendar')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'calendar' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Calendário</span>
            </button>

            <button
              onClick={() => onSelectTab('list')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <ListOrdered className="w-4 h-4 shrink-0" />
              <span>Demandas</span>
            </button>

            <button
              onClick={() => onSelectTab('requests')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'requests' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Solicitar Demanda</span>
            </button>

            <button
              onClick={() => onSelectTab('brand-kit')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'brand-kit' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Arquivos & Marca</span>
            </button>
          </>
        )}

        {/* STAFF NAVIGATION */}
        {isStaff && (
          <>
            <button
              onClick={() => onSelectTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'overview' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => onSelectTab('my-tasks')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'my-tasks' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0" />
              <span>Minhas Demandas</span>
            </button>

            <button
              onClick={() => onSelectTab('kanban')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'kanban' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Kanban className="w-4 h-4 shrink-0" />
              <span>Quadro Kanban</span>
            </button>

            <button
              onClick={() => onSelectTab('calendar')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'calendar' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Calendário Editorial</span>
            </button>

            <button
              onClick={() => onSelectTab('list')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <ListOrdered className="w-4 h-4 shrink-0" />
              <span>Lista de Entregas</span>
            </button>

            <button
              onClick={() => onSelectTab('requests')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'requests' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4 shrink-0" />
                <span>Solicitações</span>
              </div>
              {openRequestsCount > 0 && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                  {openRequestsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('metrics')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                activeTab === 'metrics' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Indicadores (RF22)</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => onSelectTab('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
                  activeTab === 'admin' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Administração</span>
              </button>
            )}
          </>
        )}

        <div className="pt-4 mt-4 border-t border-neutral-100">
          <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold px-3 mb-1">
            Validação & Testes
          </div>
          <button
            onClick={() => onSelectTab('testing')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-left transition-colors ${
              activeTab === 'testing' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Homologação AC01-AC16</span>
          </button>
        </div>
      </nav>

      {/* Footer Profile info */}
      <div className="p-3 border-t border-neutral-100 bg-neutral-50/50">
        <div className="text-xs text-neutral-500 font-mono">
          Fuso: America/Sao_Paulo
        </div>
      </div>
    </aside>
  );
};
