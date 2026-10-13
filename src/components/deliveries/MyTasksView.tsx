import React, { useState, useEffect } from 'react';
import { Delivery, InternalTask } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { DeliveryCard } from './DeliveryCard';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

interface MyTasksViewProps {
  deliveries: Delivery[];
  onOpenDetails: (delivery: Delivery) => void;
  onRefresh: () => void;
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({
  deliveries,
  onOpenDetails,
  onRefresh
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks();
      setTasks(res.tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Deliveries assigned to current user
  const myDeliveries = deliveries.filter(d => d.primaryAssigneeId === user?.id && d.productionStatus !== 'publicado');

  // Tasks assigned to current user
  const myAssignedTasks = tasks.filter(t => t.assigneeId === user?.id && !t.completed);

  // Unassigned tasks in queue ready to be claimed (RF07, AC04)
  const availableQueueTasks = tasks.filter(t => !t.assigneeId && !t.completed);

  const handleClaimTask = async (taskId: string) => {
    setBanner(null);
    try {
      const res = await api.claimTask(taskId);
      setBanner(res.message);
      await fetchTasks();
      onRefresh();
    } catch (err: any) {
      setBanner(`Erro: ${err.message}`);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await api.toggleTask(taskId);
      await fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
        <h1 className="text-xl font-bold text-neutral-900">
          Minhas Demandas & Fila de Trabalho (RF07, RF13)
        </h1>
        <p className="text-xs text-neutral-600 mt-1">
          Demandas atribuídas a você ({user?.name}), tarefas internas e fila de tarefas disponíveis para assumir.
        </p>
      </div>

      {banner && (
        <div className="p-3 bg-neutral-900 text-white text-xs rounded-lg flex items-center justify-between">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} className="text-neutral-400 hover:text-white">Fechar</button>
        </div>
      )}

      {/* Available Unassigned Tasks Queue (RF07, AC04) */}
      <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-700" />
            <h3 className="text-sm font-bold text-sky-950">
              Fila de Tarefas Disponíveis para Assumir ({availableQueueTasks.length})
            </h3>
          </div>
          <span className="text-[11px] text-sky-700 font-medium">
            Atribuição atômica no servidor (AC04)
          </span>
        </div>

        {availableQueueTasks.length === 0 ? (
          <div className="p-4 text-center text-xs text-sky-700/80 italic">
            Nenhuma tarefa livre na fila no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableQueueTasks.map(t => {
              const relDelivery = deliveries.find(d => d.id === t.deliveryId);
              return (
                <div key={t.id} className="p-3 bg-white border border-sky-200 rounded-lg text-xs flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-neutral-900 truncate">{t.title}</h4>
                    <span className="text-[11px] text-neutral-500 truncate block">
                      Entrega: {relDelivery?.title || t.deliveryId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleClaimTask(t.id)}
                    className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded font-semibold text-[11px] shrink-0 flex items-center gap-1 transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Assumir Tarefa</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deliveries assigned to me */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <span>Minhas Entregas Ativas ({myDeliveries.length})</span>
        </h3>

        {myDeliveries.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 bg-white border border-neutral-200 rounded-xl">
            Você não possui entregas ativas no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myDeliveries.map(d => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Individual checklist tasks assigned to me */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900">
          Minhas Tarefas Internas no Checklist ({myAssignedTasks.length})
        </h3>

        <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
          {myAssignedTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              Nenhuma tarefa pendente atribuída ao seu nome.
            </div>
          ) : (
            myAssignedTasks.map(t => (
              <div key={t.id} className="p-3 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => handleToggleTask(t.id)}
                    className="w-4 h-4 rounded text-neutral-900 cursor-pointer"
                  />
                  <span className="font-medium text-neutral-900">{t.title}</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-500 uppercase bg-neutral-100 px-2 py-0.5 rounded">
                  {t.type}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
