import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, RefreshCw, ChevronDown, Check, UserCheck, Shield, Building2 } from 'lucide-react';
import { Notification } from '../../types';
import { api } from '../../lib/api';

interface TopBarProps {
  currentViewTitle: string;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentViewTitle,
  onOpenNotifications,
  unreadNotificationsCount
}) => {
  const { user, demoUsers, switchUser, resetDatabase, isAdmin, isStaff, isClient } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDb = async () => {
    if (confirm('Deseja restaurar a base de dados para o estado inicial de demonstração? Isso repõe os clientes, entregas e tarefas padrão.')) {
      setIsResetting(true);
      await resetDatabase();
      setIsResetting(false);
      window.location.reload();
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'employee':
        return 'Equipe Operacional';
      case 'client_approver':
        return 'Cliente · Aprovador';
      case 'client_viewer':
        return 'Cliente · Consulta';
      default:
        return 'Usuário';
    }
  };

  return (
    <header className="h-14 border-b border-neutral-200 bg-white px-6 flex items-center justify-between gap-8 shrink-0 z-20">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap">
          Commet
        </span>
        <span className="text-xs text-neutral-400 font-mono">|</span>
        <span className="text-xs text-neutral-500 font-medium">Ecossistema</span>
      </div>

      {/* Zone 2: Navigation Breadcrumb / Context */}
      <div className="hidden md:flex items-center gap-2 text-sm text-neutral-600 truncate">
        <span className="text-neutral-400 font-normal">Módulo de Marketing</span>
        <span className="text-neutral-300">/</span>
        <span className="font-medium text-neutral-900 truncate">{currentViewTitle}</span>
        {isClient && (
          <>
            <span className="text-neutral-300">·</span>
            <span className="text-xs px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded font-medium">
              Portal Isolado do Cliente
            </span>
          </>
        )}
      </div>

      {/* Zone 3: Actions & Profile Switcher */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-amber-700 hidden lg:inline">Piloto local · dados propostos</span>
        {/* Notifications Button */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
          title="Notificações"
          aria-label="Abrir notificações"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full" />
          )}
        </button>

        {/* User Switcher Dropdown (Crucial for evaluation of multiple roles AC01, AC02) */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 pl-2 pr-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors text-left"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-neutral-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold">
                {user?.name.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-xs font-semibold text-neutral-900 truncate max-w-[140px]">
                {user?.name}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium">
                {getRoleLabel(user?.role)}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </button>

          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg py-2 z-40 text-xs">
                <div className="px-3 py-2 border-b border-neutral-100">
                  <div className="font-semibold text-neutral-900">Simulador de Perfis</div>
                  <div className="text-neutral-500 text-[11px]">
                    Alterne instantaneamente para testar o isolamento e permissões (AC01, AC02)
                  </div>
                </div>

                <div className="py-1 max-h-72 overflow-y-auto">
                  {demoUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-neutral-50 transition-colors ${
                        user?.id === u.id ? 'bg-neutral-50 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="text-neutral-900 truncate font-medium">{u.name}</div>
                          <div className="text-neutral-500 text-[10px] truncate">
                            {getRoleLabel(u.role)} {u.clientId ? `· ${u.clientId.replace('cli_', '').toUpperCase()}` : ''}
                          </div>
                        </div>
                      </div>
                      {user?.id === u.id && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
