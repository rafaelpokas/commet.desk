import React, { useState, useEffect } from 'react';
import { User, Client, ClientChannelAssignee, MonthlyObligation } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  Building, 
  Share2, 
  CalendarClock, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  UserX, 
  UserCheck, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'clients' | 'channels' | 'plans'>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [channelAssignees, setChannelAssignees] = useState<ClientChannelAssignee[]>([]);
  const [obligations, setObligations] = useState<MonthlyObligation[]>([]);

  const [loading, setLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('employee');
  const [newUserClientId, setNewUserClientId] = useState('');

  // Channel Assignee Form
  const [selectedClientForAssignee, setSelectedClientForAssignee] = useState('cli_solartech');
  const [selectedChannelForAssignee, setSelectedChannelForAssignee] = useState('instagram');
  const [selectedUserForAssignee, setSelectedUserForAssignee] = useState('usr_ana');

  // Plan Generation Form (AC13)
  const [generateClientId, setGenerateClientId] = useState('cli_solartech');
  const [generateCompetence, setGenerateCompetence] = useState('2026-10');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, cRes, caRes, oRes] = await Promise.all([
        api.getUsers(),
        api.getClients(),
        api.getChannelAssignees(),
        api.getObligations()
      ]);
      setUsers(uRes.users);
      setClients(cRes.clients);
      setChannelAssignees(caRes.assignees);
      setObligations(oRes.obligations);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar dados administrativos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setBannerMessage(null);

    try {
      const res = await api.createUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole as any,
        clientId: (newUserRole === 'client_approver' || newUserRole === 'client_viewer') ? newUserClientId : undefined
      });
      setBannerMessage(res.message);
      setNewUserName('');
      setNewUserEmail('');
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao cadastrar usuário');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Deseja desativar este usuário? Suas tarefas abertas entrarão na fila de reatribuição (AC14).')) return;
    setErrorMessage(null);
    setBannerMessage(null);

    try {
      const res = await api.deactivateUser(userId);
      setBannerMessage(res.message);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao desativar usuário');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const res = await api.activateUser(userId);
      setBannerMessage(res.message);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao reativar usuário');
    }
  };

  const handleSaveChannelAssignee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setBannerMessage(null);

    try {
      const res = await api.setChannelAssignee(
        selectedClientForAssignee,
        selectedChannelForAssignee,
        selectedUserForAssignee
      );
      setBannerMessage(res.message);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao configurar responsável');
    }
  };

  const handleGeneratePlan = async () => {
    setErrorMessage(null);
    setBannerMessage(null);

    try {
      const res = await api.generateMonthlyPlan(generateClientId, generateCompetence);
      setBannerMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao gerar plano mensal');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
        <h1 className="text-xl font-bold text-neutral-900">
          Painel de Administração Commet (RF18)
        </h1>
        <p className="text-xs text-neutral-600 mt-1">
          Gerenciamento exclusivo do administrador: clientes, usuários, responsáveis por canal e regras de obrigações mensais.
        </p>
      </div>

      {bannerMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-emerald-700 font-semibold hover:underline">
            Fechar
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-semibold hover:underline">
            Fechar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors ${
            activeTab === 'users' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Usuários & Equipe</span>
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors ${
            activeTab === 'channels' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Responsáveis por Canal (RF06, AC03)</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors ${
            activeTab === 'plans' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Obrigações & Geração de Plano (RF08, AC13)</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors ${
            activeTab === 'clients' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Clientes & Marcas</span>
        </button>
      </div>

      {/* TAB: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Create User Form */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-3">Convidar Novo Usuário</h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-neutral-600 mb-1 font-medium">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Nome do profissional"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-600 mb-1 font-medium">E-mail</label>
                <input
                  type="email"
                  placeholder="email@empresa.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-600 mb-1 font-medium">Papel / Função</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                >
                  <option value="employee">Funcionário (Equipe Commet)</option>
                  <option value="admin">Administrador Geral</option>
                  <option value="client_approver">Cliente · Aprovador Designado</option>
                  <option value="client_viewer">Cliente · Visualizador (Apenas Consulta)</option>
                </select>
              </div>

              {(newUserRole === 'client_approver' || newUserRole === 'client_viewer') ? (
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Empresa do Cliente</label>
                  <select
                    value={newUserClientId}
                    onChange={(e) => setNewUserClientId(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded bg-white"
                    required
                  >
                    <option value="">Selecione...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Convidar Usuário</span>
                  </button>
                </div>
              )}

              {(newUserRole === 'client_approver' || newUserRole === 'client_viewer') && (
                <div className="md:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    className="py-2 px-4 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Contato do Cliente</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="text-sm font-bold text-neutral-900">Usuários Cadastrados ({users.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Papel</th>
                    <th className="p-3">Empresa Vinculada</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações (AC14)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50/50">
                      <td className="p-3 font-medium text-neutral-900 flex items-center gap-2">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-[10px]">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <span>{u.name}</span>
                      </td>
                      <td className="p-3 font-mono text-neutral-600">{u.email}</td>
                      <td className="p-3">
                        <span className="font-medium text-neutral-800">
                          {u.role === 'admin' ? 'Administrador' : u.role === 'employee' ? 'Funcionário' : u.role === 'client_approver' ? 'Aprovador' : 'Consulta'}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-600">
                        {u.clientId ? (u.clientId === 'cli_solartech' ? 'SolarTech Brasil' : 'Nexa Logística') : 'Equipe Interna Commet'}
                      </td>
                      <td className="p-3">
                        {u.status === 'active' ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                            Ativo
                          </span>
                        ) : (
                          <span className="text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-[11px] font-medium">
                            Desativado
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {u.id !== user?.id && (
                          u.status === 'active' ? (
                            <button
                              onClick={() => handleDeactivateUser(u.id)}
                              className="text-rose-600 hover:text-rose-800 font-medium text-[11px] px-2 py-1 rounded hover:bg-rose-50"
                              title="Desativa usuário e move tarefas abertas para fila de reatribuição (AC14)"
                            >
                              Desativar (AC14)
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(u.id)}
                              className="text-emerald-600 hover:text-emerald-800 font-medium text-[11px] px-2 py-1 rounded hover:bg-emerald-50"
                            >
                              Reativar
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CHANNEL ASSIGNEES (RF06, AC03) */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">
              Configurar Responsável Padrão por Cliente e Canal (RF06, AC03)
            </h3>
            <p className="text-xs text-neutral-600">
              Uma entrega de Instagram pode ter Ana como responsável e a entrega de LinkedIn ter Bruno. Trocar o padrão afeta apenas novas entregas e não altera silenciosamente itens já existentes.
            </p>

            <form onSubmit={handleSaveChannelAssignee} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-neutral-600 mb-1 font-medium">Cliente</label>
                <select
                  value={selectedClientForAssignee}
                  onChange={(e) => setSelectedClientForAssignee(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 mb-1 font-medium">Canal</label>
                <select
                  value={selectedChannelForAssignee}
                  onChange={(e) => setSelectedChannelForAssignee(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                >
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 mb-1 font-medium">Responsável Padrão da Equipe</label>
                <select
                  value={selectedUserForAssignee}
                  onChange={(e) => setSelectedUserForAssignee(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded bg-white"
                >
                  {users.filter(u => u.role === 'employee' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.title || 'Equipe'})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Salvar Regra de Distribuição
                </button>
              </div>
            </form>
          </div>

          {/* Current Assignees Matrix */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="text-sm font-bold text-neutral-900">Matriz Vigente de Responsáveis Padrão</h3>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Responsável Padrão Atribuído</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {channelAssignees.map(ca => {
                  const client = clients.find(c => c.id === ca.clientId);
                  const assignee = users.find(u => u.id === ca.defaultAssigneeId);
                  return (
                    <tr key={ca.id} className="hover:bg-neutral-50/50">
                      <td className="p-3 font-semibold text-neutral-900">{client?.name || ca.clientId}</td>
                      <td className="p-3 uppercase font-mono text-neutral-600">{ca.channel}</td>
                      <td className="p-3 font-medium text-neutral-800">{assignee?.name || 'Não encontrado'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PLANS & OBLIGATIONS (RF08, AC13) */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">
              Geração de Plano Mensal com Idempotência (RF08, AC13)
            </h3>
            <p className="text-xs text-neutral-600">
              Gera automaticamente as entregas da competência com base nas cotas contratadas de cada canal. A execução repetida para a mesma competência não pode duplicar entregas (AC13).
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="block text-neutral-600 mb-1 font-medium">Cliente</label>
                <select
                  value={generateClientId}
                  onChange={(e) => setGenerateClientId(e.target.value)}
                  className="p-2 border border-neutral-300 rounded bg-white min-w-[200px]"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 mb-1 font-medium">Competência (AAAA-MM)</label>
                <input
                  type="text"
                  value={generateCompetence}
                  onChange={(e) => setGenerateCompetence(e.target.value)}
                  className="p-2 border border-neutral-300 rounded bg-white font-mono"
                  placeholder="2026-10"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleGeneratePlan}
                  className="py-2 px-4 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Entregas do Mês (Testar Idempotência AC13)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Obligations List */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="text-sm font-bold text-neutral-900">Cotas Contratadas por Cliente e Canal</h3>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Formato</th>
                  <th className="p-3">Quantidade Prevista/Mês</th>
                  <th className="p-3">Padrão de Título</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {obligations.map(obl => {
                  const client = clients.find(c => c.id === obl.clientId);
                  return (
                    <tr key={obl.id} className="hover:bg-neutral-50/50">
                      <td className="p-3 font-semibold text-neutral-900">{client?.name || obl.clientId}</td>
                      <td className="p-3 uppercase font-mono text-neutral-700">{obl.channel}</td>
                      <td className="p-3 text-neutral-600">{obl.format}</td>
                      <td className="p-3 font-mono font-bold text-neutral-900">{obl.monthlyQuantity} entregas</td>
                      <td className="p-3 text-neutral-500 font-mono text-[11px]">{obl.titleTemplate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CLIENTS */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map(c => (
              <div key={c.id} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-neutral-900">{c.name}</h3>
                  <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                    {c.timezone}
                  </span>
                </div>
                <div className="text-xs text-neutral-600">
                  <span className="font-semibold">Razão Social:</span> {c.tradeName}
                </div>
                <div className="text-xs text-neutral-600">
                  <span className="font-semibold">Canais Atendidos:</span> {c.channels.join(', ').toUpperCase()}
                </div>
                <div className="text-xs p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="font-semibold text-neutral-700 block mb-1">Diretrizes da Marca:</span>
                  <p className="text-neutral-600">{c.brandKit.guidelinesNotes || 'Sem observações cadastradas'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
