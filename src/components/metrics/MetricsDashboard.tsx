import React, { useState, useEffect } from 'react';
import { OperationalMetrics } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart3, 
  CheckCheck, 
  Clock, 
  RotateCcw, 
  Users, 
  TrendingUp,
  AlertTriangle,
  Calendar
} from 'lucide-react';

export const MetricsDashboard: React.FC = () => {
  const { isStaff, user } = useAuth();
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [competence, setCompetence] = useState('2026-10');
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.getOperationalMetrics(competence);
      setMetrics(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [competence]);

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Indicadores Operacionais Commet (RF22)
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Métricas de cumprimento de obrigações contratuais, pontualidade, retrabalho e distribuição de esforço da equipe.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 font-medium">Competência:</span>
          <select
            value={competence}
            onChange={(e) => setCompetence(e.target.value)}
            className="p-1.5 border border-neutral-300 rounded-lg bg-white font-mono"
          >
            <option value="2026-10">Outubro 2026</option>
            <option value="2026-09">Setembro 2026</option>
          </select>
        </div>
      </div>

      {metrics && (
        <>
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Cumprimento do Mês */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-500 mb-2">
                <span className="text-xs font-semibold">Cumprimento do Mês</span>
                <CheckCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {metrics.fulfillmentRate}%
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                {metrics.publishedCount} publicadas de {metrics.totalExpected} obrigações previstas
              </p>
            </div>

            {/* 2. Publicação no Prazo */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-500 mb-2">
                <span className="text-xs font-semibold">Publicação no Prazo</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {metrics.onTimeRate}%
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                Calculado sobre datas originais acordadas (AC11)
              </p>
            </div>

            {/* 3. Tempo Médio de Aprovação */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-500 mb-2">
                <span className="text-xs font-semibold">Tempo de Aprovação</span>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {metrics.avgApprovalHours}h
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                Média entre envio da versão e decisão do cliente
              </p>
            </div>

            {/* 4. Retrabalho */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-neutral-500 mb-2">
                <span className="text-xs font-semibold">Índice de Retrabalho</span>
                <RotateCcw className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {metrics.reworkRate}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                Rodadas de ajuste ou reprovação por entrega
              </p>
            </div>
          </div>

          {/* Workload by Person */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-700" />
              <span>Carga de Trabalho da Equipe Operacional (RF22)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.workloadByPerson.map(person => (
                <div key={person.userId} className="p-4 border border-neutral-200 rounded-lg bg-neutral-50/50 space-y-3">
                  <div className="flex items-center gap-2.5">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {person.userName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-neutral-900 truncate">{person.userName}</h4>
                      <p className="text-[11px] text-neutral-500 truncate">{person.title || 'Membro da Equipe'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-neutral-200">
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Entregas Ativas</span>
                      <span className="text-base font-bold font-mono text-neutral-900 tabular-nums">
                        {person.activeDeliveries}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-500 block">Tarefas no Checklist</span>
                      <span className="text-base font-bold font-mono text-neutral-900 tabular-nums">
                        {person.activeTasks}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">
              Distribuição do Pipeline na Competência
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="text-[11px] text-neutral-500">Não Iniciado</div>
                <div className="text-xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
                  {metrics.statusBreakdown.nao_iniciado || 0}
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                <div className="text-[11px] text-blue-700 font-medium">Em Produção</div>
                <div className="text-xl font-bold font-mono text-blue-900 mt-1 tabular-nums">
                  {metrics.statusBreakdown.em_producao || 0}
                </div>
              </div>

              <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200">
                <div className="text-[11px] text-purple-700 font-medium">Revisão Interna</div>
                <div className="text-xl font-bold font-mono text-purple-900 mt-1 tabular-nums">
                  {metrics.statusBreakdown.revisao_interna || 0}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                <div className="text-[11px] text-emerald-700 font-medium">Pronto p/ Publicar</div>
                <div className="text-xl font-bold font-mono text-emerald-900 mt-1 tabular-nums">
                  {metrics.statusBreakdown.pronto_para_publicar || 0}
                </div>
              </div>

              <div className="p-3 bg-cyan-50/50 rounded-lg border border-cyan-200">
                <div className="text-[11px] text-cyan-700 font-medium">Agendado</div>
                <div className="text-xl font-bold font-mono text-cyan-900 mt-1 tabular-nums">
                  {metrics.statusBreakdown.agendado || 0}
                </div>
              </div>

              <div className="p-3 bg-emerald-100/60 rounded-lg border border-emerald-300">
                <div className="text-[11px] text-emerald-900 font-bold">Publicado</div>
                <div className="text-xl font-bold font-mono text-emerald-950 mt-1 tabular-nums">
                  {metrics.statusBreakdown.publicado || 0}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
