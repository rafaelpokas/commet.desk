import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TopBar } from './components/common/TopBar';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { EditorialCalendar } from './components/calendar/EditorialCalendar';
import { DeliveriesListView } from './components/deliveries/DeliveriesListView';
import { DeliveryDetailModal } from './components/deliveries/DeliveryDetailModal';
import { CreateDeliveryModal } from './components/deliveries/CreateDeliveryModal';
import { MyTasksView } from './components/deliveries/MyTasksView';
import { ClientPortal } from './components/portal/ClientPortal';
import { RequestsManager } from './components/requests/RequestsManager';
import { MetricsDashboard } from './components/metrics/MetricsDashboard';
import { AdminPanel } from './components/admin/AdminPanel';
import { AcceptanceCriteriaRunner } from './components/testing/AcceptanceCriteriaRunner';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer';
import { StaffOverview } from './components/dashboard/StaffOverview';
import { Delivery, Client, ProductionStatus } from './types';
import { api } from './lib/api';

function MainLayout() {
  const { user, isStaff, isClient, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  const fetchCoreData = async () => {
    try {
      const [delRes, cliRes, notifRes] = await Promise.all([
        api.getDeliveries(),
        api.getClients(),
        api.getNotifications()
      ]);
      setDeliveries(delRes.deliveries);
      setClients(cliRes.clients);
      setUnreadNotificationsCount(notifRes.unreadCount);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro na comunicação com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoreData();
  }, [user?.id]);

  // Handle client portal tab defaults
  useEffect(() => {
    if (isClient && (activeTab === 'my-tasks' || activeTab === 'admin' || activeTab === 'metrics' || activeTab === 'kanban')) {
      setActiveTab('overview');
    }
  }, [user?.role]);

  const handleTransitionStatus = async (deliveryId: string, targetStatus: ProductionStatus) => {
    try {
      await api.transitionStatus(deliveryId, { targetStatus });
      await fetchCoreData();
    } catch (err: any) {
      alert(err.message || 'Erro na transição');
    }
  };

  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview': return 'Visão Geral';
      case 'my-tasks': return 'Minhas Demandas';
      case 'kanban': return 'Quadro Kanban';
      case 'calendar': return 'Calendário Editorial';
      case 'list': return 'Lista de Entregas';
      case 'requests': return 'Solicitações';
      case 'metrics': return 'Indicadores Operacionais';
      case 'admin': return 'Administração';
      case 'approvals': return 'Aprovações Pendentes';
      case 'brand-kit': return 'Arquivos & Marca';
      case 'testing': return 'Suíte de Homologação AC01-AC16';
    }
  };

  const pendingApprovalsCount = deliveries.filter(d => d.approvalStatus === 'aguardando_aprovacao').length;
  const currentClient = clients.find(c => c.id === user?.clientId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-100 font-sans">
      {/* TopBar with single line brand, role status and profile switcher */}
      <TopBar
        currentViewTitle={getTabTitle(activeTab)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingApprovalsCount={pendingApprovalsCount}
          openRequestsCount={0}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-500 font-medium">
              Carregando dados da operação Commet...
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                isClient ? (
                  <ClientPortal
                    deliveries={deliveries}
                    client={currentClient}
                    onOpenDetails={(d) => setSelectedDelivery(d)}
                    onRequestDemand={() => setActiveTab('requests')}
                  />
                ) : (
                  <StaffOverview
                    deliveries={deliveries}
                    clients={clients}
                    onOpenDetails={(d) => setSelectedDelivery(d)}
                    onNavigateTab={setActiveTab}
                    onCreateDelivery={() => setCreateModalOpen(true)}
                  />
                )
              )}

              {activeTab === 'approvals' && (
                <ClientPortal
                  deliveries={deliveries}
                  client={currentClient}
                  onOpenDetails={(d) => setSelectedDelivery(d)}
                  onRequestDemand={() => setActiveTab('requests')}
                />
              )}

              {activeTab === 'brand-kit' && (
                <ClientPortal
                  deliveries={deliveries}
                  client={currentClient}
                  onOpenDetails={(d) => setSelectedDelivery(d)}
                  onRequestDemand={() => setActiveTab('requests')}
                />
              )}

              {activeTab === 'my-tasks' && (
                <MyTasksView
                  deliveries={deliveries}
                  onOpenDetails={(d) => setSelectedDelivery(d)}
                  onRefresh={fetchCoreData}
                />
              )}

              {activeTab === 'kanban' && (
                <KanbanBoard
                  deliveries={deliveries}
                  clients={clients}
                  onOpenDetails={(d) => setSelectedDelivery(d)}
                  onTransitionStatus={handleTransitionStatus}
                  onCreateDelivery={() => setCreateModalOpen(true)}
                />
              )}

              {activeTab === 'calendar' && (
                <EditorialCalendar
                  deliveries={deliveries}
                  onOpenDetails={(d) => setSelectedDelivery(d)}
                  timezone={currentClient?.timezone || 'America/Sao_Paulo'}
                />
              )}

              {activeTab === 'list' && (
                <DeliveriesListView
                  deliveries={deliveries}
                  clients={clients}
                  onOpenDetails={(d) => setSelectedDelivery(d)}
                  onTransitionStatus={handleTransitionStatus}
                />
              )}

              {activeTab === 'requests' && (
                <RequestsManager
                  onDeliveryCreated={fetchCoreData}
                />
              )}

              {activeTab === 'metrics' && (
                <MetricsDashboard />
              )}

              {activeTab === 'admin' && (
                <AdminPanel />
              )}

              {activeTab === 'testing' && (
                <AcceptanceCriteriaRunner />
              )}
            </>
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {selectedDelivery && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onRefresh={fetchCoreData}
        />
      )}

      {/* Create Delivery Modal */}
      <CreateDeliveryModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={fetchCoreData}
        clients={clients}
      />

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onRefreshUnread={() => fetchCoreData()}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
