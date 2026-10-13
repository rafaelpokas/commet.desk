import React, { useState, useEffect } from 'react';
import { Notification } from '../../types';
import { api } from '../../lib/api';
import { Bell, Check, X, CheckCircle2, Clock, Send, MessageSquare } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshUnread: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshUnread
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      onRefreshUnread();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      await fetchNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReadAll = async () => {
    try {
      await api.readAllNotifications();
      await fetchNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-bold text-neutral-900">Notificações Operacionais</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReadAll}
              className="text-xs text-neutral-600 hover:text-neutral-900 font-medium px-2 py-1 rounded hover:bg-neutral-200/60"
            >
              Marcar lidas
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400">
              Nenhuma notificação no momento.
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className={`p-4 hover:bg-neutral-50 transition-colors text-xs space-y-1 cursor-pointer ${
                  !n.read ? 'bg-sky-50/40' : ''
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-neutral-900">{n.title}</span>
                  <span className="text-neutral-400 font-mono">
                    {new Date(n.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-neutral-600 leading-relaxed">{n.message}</p>
                {!n.read && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-600" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
