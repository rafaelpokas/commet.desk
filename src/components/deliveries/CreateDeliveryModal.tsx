import { currentCompetence, localDateTimeToIso } from '../../lib/dates';
import React, { useState, useEffect } from 'react';
import { Client, Channel, DeliveryPriority, DeliveryVisibility, User } from '../../types';
import { api } from '../../lib/api';
import { X, Plus, AlertTriangle } from 'lucide-react';

interface CreateDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  clients: Client[];
}

export const CreateDeliveryModal: React.FC<CreateDeliveryModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  clients
}) => {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [competenceMonth, setCompetenceMonth] = useState(currentCompetence());
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState<Channel>('instagram');
  const [format, setFormat] = useState<string>('carrossel');
  const [priority, setPriority] = useState<DeliveryPriority>('media');
  const [visibility, setVisibility] = useState<DeliveryVisibility>('internal');
  const [briefing, setBriefing] = useState('');
  const [copywriting, setCopywriting] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id);
    }
  }, [clients]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Título é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.createDelivery({
        clientId,
        competenceMonth,
        title: title.trim(),
        channel,
        format,
        priority,
        visibility,
        briefing: briefing.trim(),
        copywriting: copywriting.trim(),
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        scheduledPublicationDate: scheduledDate ? localDateTimeToIso(scheduledDate, clients.find(c=>c.id === clientId)?.timezone || 'America/Sao_Paulo') : undefined
      });
      setTitle(''); setBriefing(''); setCopywriting(''); setMediaUrl(''); setScheduledDate('');
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar entrega');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-2xl p-6 space-y-4 animate-in fade-in">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Nova Entrega de Marketing</h3>
            <p className="text-xs text-neutral-500">
              O responsável será atribuído automaticamente conforme a regra do canal (RF06, AC03).
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-violet-50 rounded-lg text-violet-900"><strong>Referência da marca</strong><p className="mt-1 whitespace-pre-wrap">{clients.find(c=>c.id === clientId)?.brandKit.guidelinesNotes || 'Adicione as diretrizes e arquivos oficiais em Identidade & referências.'}</p><p className="mt-2">Datas no fuso {clients.find(c=>c.id===clientId)?.timezone || 'America/Sao_Paulo'}. Consulte o acervo atualizado antes de criar a arte.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded bg-white"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Competência (AAAA-MM)</label>
              <input
                type="text"
                value={competenceMonth}
                onChange={(e) => setCompetenceMonth(e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Título da Publicação</label>
            <input
              type="text"
              placeholder="Ex: Como economizar na conta de luz em 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-neutral-300 rounded bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Canal de Destino</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full p-2 border border-neutral-300 rounded bg-white font-medium"
              >
                <option value="instagram">Instagram (Ana Silva)</option>
                <option value="linkedin">LinkedIn (Bruno Costa)</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Formato</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded bg-white"
              >
                <option value="carrossel">Carrossel</option>
                <option value="estatico">Post Estático</option>
                <option value="reels">Reels / Vídeo Curto</option>
                <option value="artigo">Artigo B2B</option>
                <option value="stories">Stories</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Visibilidade Inicial</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full p-2 border border-neutral-300 rounded bg-white"
              >
                <option value="shared">Compartilhado no Portal</option>
                <option value="internal">🔒 Rascunho Interno da Equipe</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Briefing e Instruções</label>
            <textarea
              rows={2}
              placeholder="Objetivo estratégico da entrega..."
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              className="w-full p-2 border border-neutral-300 rounded bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Texto / Legenda Proposta</label>
            <textarea
              rows={3}
              placeholder="Copywriting completo da publicação..."
              value={copywriting}
              onChange={(e) => setCopywriting(e.target.value)}
              className="w-full p-2 border border-neutral-300 rounded bg-white font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Data Prevista de Publicação</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">URL da Imagem / Criativo</label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-neutral-600 hover:text-neutral-900 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
