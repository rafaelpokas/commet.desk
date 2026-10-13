import React, { useState } from 'react';
import { Delivery } from '../../types';
import { ChannelIcon, ApprovalStatusBadge } from '../common/StatusBadge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';

interface EditorialCalendarProps {
  deliveries: Delivery[];
  onOpenDetails: (delivery: Delivery) => void;
  timezone?: string;
}

export const EditorialCalendar: React.FC<EditorialCalendarProps> = ({
  deliveries,
  onOpenDetails,
  timezone = 'America/Sao_Paulo'
}) => {
  // Calendar month state (defaults to October 2026 based on seed data)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 is October
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Days in month calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  // Group deliveries with dates in current month vs undated deliveries
  const undatedDeliveries = deliveries.filter(d => !d.scheduledPublicationDate);

  const deliveriesByDay: Record<number, Delivery[]> = {};
  for (let i = 1; i <= daysInMonth; i++) {
    deliveriesByDay[i] = [];
  }

  for (const d of deliveries) {
    if (d.scheduledPublicationDate) {
      const date = new Date(d.scheduledPublicationDate);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        const day = date.getDate();
        if (deliveriesByDay[day]) {
          deliveriesByDay[day].push(d);
        }
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Calendar Header */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-neutral-700" />
          <h2 className="text-base font-bold text-neutral-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
            Fuso: {timezone}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'month' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-2xs text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Lista
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center border border-neutral-300 rounded-lg">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-neutral-50 text-neutral-600 transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-neutral-50 text-neutral-600 transition-colors border-l border-neutral-300"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MONTH GRID VIEW */}
      {viewMode === 'month' ? (
        <div className="flex-1 p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px bg-neutral-200 border border-neutral-200 rounded-t-lg text-xs font-semibold text-neutral-600 text-center py-2 bg-neutral-100">
              <div>Dom</div>
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-px bg-neutral-200 border-x border-b border-neutral-200 rounded-b-lg">
              {/* Empty leading cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-neutral-50 min-h-[110px] p-2" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayDeliveries = deliveriesByDay[day] || [];
                const isToday = currentYear === 2026 && currentMonth === 9 && day === 13;

                return (
                  <div
                    key={`day-${day}`}
                    className={`bg-white min-h-[110px] p-2 flex flex-col transition-colors hover:bg-neutral-50/50 ${
                      isToday ? 'bg-sky-50/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[11px]'
                            : 'text-neutral-700'
                        }`}
                      >
                        {day}
                      </span>
                      {dayDeliveries.length > 0 && (
                        <span className="text-[10px] font-mono text-neutral-400">
                          {dayDeliveries.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 overflow-y-auto">
                      {dayDeliveries.map(d => (
                        <button
                          key={d.id}
                          onClick={() => onOpenDetails(d)}
                          className="w-full text-left p-1.5 rounded border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors text-[11px] leading-tight block"
                        >
                          <div className="flex items-center gap-1 font-semibold text-neutral-900 mb-0.5 truncate">
                            <ChannelIcon channel={d.channel} className="w-3 h-3 shrink-0" />
                            <span className="truncate">{d.title}</span>
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            {d.approvalStatus === 'aprovado' ? '✓ Aprovado' : 'Aguardando'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="flex-1 p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Cronograma Editorial em Lista ({monthNames[currentMonth]} {currentYear})
          </h3>
          <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
            {deliveries
              .filter(d => d.scheduledPublicationDate)
              .sort((a, b) => new Date(a.scheduledPublicationDate!).getTime() - new Date(b.scheduledPublicationDate!).getTime())
              .map(d => (
                <div
                  key={d.id}
                  onClick={() => onOpenDetails(d)}
                  className="p-3.5 flex items-center justify-between gap-4 hover:bg-neutral-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChannelIcon channel={d.channel} className="w-4 h-4 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-900 truncate">{d.title}</h4>
                      <div className="text-neutral-500 text-[11px] mt-0.5">
                        {d.clientId === 'cli_solartech' ? 'SolarTech' : 'Nexa Log'} · Responsável: {d.primaryAssigneeName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <ApprovalStatusBadge status={d.approvalStatus} />
                    <div className="text-right font-mono text-[11px] text-neutral-600">
                      {new Date(d.scheduledPublicationDate!).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Undated Deliveries Queue (RF15) */}
      {undatedDeliveries.length > 0 && (
        <div className="p-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              <span>Fila de Entregas Sem Data Prevista Agendada ({undatedDeliveries.length})</span>
            </h4>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {undatedDeliveries.map(d => (
              <div
                key={d.id}
                onClick={() => onOpenDetails(d)}
                className="w-64 p-2.5 bg-white border border-neutral-200 rounded-lg text-xs cursor-pointer hover:border-neutral-400 shrink-0"
              >
                <div className="flex items-center gap-1.5 font-semibold text-neutral-800 truncate mb-1">
                  <ChannelIcon channel={d.channel} className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{d.title}</span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  {d.clientId === 'cli_solartech' ? 'SolarTech' : 'Nexa Log'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
