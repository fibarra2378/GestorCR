import React, { useState, useEffect } from 'react';
import { TicketList } from '../components/TicketList';
import { TicketChat } from '../components/TicketChat';
import { api, WSSubscription } from '../services/api';
import { Ticket, TicketStatus, TicketCategory } from '../types';
import { Ticket as TicketIcon, Clock, CheckCircle2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]); // Unfiltered tickets for global KPI calculation
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [kpiPulsing, setKpiPulsing] = useState(false);

  const triggerKpiPulse = () => {
    setKpiPulsing(true);
    setTimeout(() => setKpiPulsing(false), 1200);
  };

  const fetchTickets = async () => {
    try {
      // 1. Fetch filtered tickets for the list
      const res = await api.get('/tickets', {
        params: {
          search: searchQuery,
          status: statusFilter,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined
        }
      });
      setTickets(res.data.data);

      // 2. Fetch all tickets without filters to compute global KPI cards & category badges
      const allRes = await api.get('/tickets');
      setAllTickets(allRes.data.data);

      if (selectedTicket) {
        const updated = res.data.data.find((t: Ticket) => t.id === selectedTicket.id);
        if (updated) {
          fetchTicketDetails(updated.id);
        }
      }
    } catch (err) {
      console.error('Error al obtener tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id: string) => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setSelectedTicket(res.data.data);
    } catch (err) {
      console.error('Error al obtener detalle de ticket', err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [searchQuery, statusFilter, categoryFilter]);

  useEffect(() => {
    WSSubscription.connect();
    const unsubscribe = WSSubscription.subscribe((event) => {
      if (event.type === 'NEW_TICKET' || event.type === 'TICKET_UPDATED') {
        triggerKpiPulse();
        fetchTickets();
      } else if (event.type === 'NEW_MESSAGE') {
        triggerKpiPulse();
        fetchTickets();
        if (selectedTicket && selectedTicket.id === event.payload.ticketId) {
          fetchTicketDetails(selectedTicket.id);
        }
      }
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  const handleSelectTicket = (ticket: Ticket) => {
    fetchTicketDetails(ticket.id);

    // If ticket is NUEVO, automatically mark it EN_REVISION (attended) to update badges & counters
    if (ticket.status === 'NUEVO') {
      handleUpdateStatus(ticket.id, 'EN_REVISION');
    }
  };

  const handleSendReply = async (ticketId: string, body: string) => {
    await api.post(`/tickets/${ticketId}/reply`, { body });
    await fetchTicketDetails(ticketId);
    await fetchTickets();
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    await api.patch(`/tickets/${ticketId}`, { status });
    triggerKpiPulse();
    await fetchTicketDetails(ticketId);
    await fetchTickets();
  };

  const handleUpdateCategory = async (ticketId: string, category: TicketCategory) => {
    await api.patch(`/tickets/${ticketId}`, { category });
    triggerKpiPulse();
    await fetchTicketDetails(ticketId);
    await fetchTickets();
  };

  // KPI Calculations based on allTickets
  const totalTickets = allTickets.length;
  const activeTickets = allTickets.filter((t) => t.status === 'NUEVO' || t.status === 'EN_REVISION' || t.status === 'PENDIENTE_AFILIADO').length;
  const resolvedTickets = allTickets.filter((t) => t.status === 'RESUELTO' || t.status === 'CERRADO').length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100;

  // Category Badges & Unattended Count Calculator
  const getCategoryMetrics = (catKey: string) => {
    if (catKey === 'ALL') {
      const total = allTickets.length;
      const newCount = allTickets.filter((t) => t.status === 'NUEVO').length;
      return { total, newCount };
    }
    const filtered = allTickets.filter((t) => t.category === catKey);
    const total = filtered.length;
    const newCount = filtered.filter((t) => t.status === 'NUEVO').length;
    return { total, newCount };
  };

  const categories = [
    { key: 'ALL', label: 'Todas las Áreas' },
    { key: 'CONSULTA', label: 'Consultas Generales' },
    { key: 'RECLAMO', label: 'Reclamos' },
    { key: 'MATRICULA', label: 'Matrículas' },
    { key: 'CUOTA', label: 'Cuotas / Facturación' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
      {/* Top KPI Header Row */}
      <div className="kpi-row">
        <div className={`kpi-card kpi-card-gradient-1 ${kpiPulsing ? 'pulse-update' : ''}`}>
          <div>
            <div className="kpi-lbl">Tickets Totales</div>
            <div className="kpi-val">{totalTickets}</div>
          </div>
          <TicketIcon size={36} style={{ opacity: 0.8 }} />
        </div>

        <div className={`kpi-card ${kpiPulsing ? 'pulse-update' : ''}`}>
          <div>
            <div className="kpi-lbl">En Atención / Nuevos</div>
            <div className="kpi-val" style={{ color: 'var(--c-navy-rich)' }}>{activeTickets}</div>
          </div>
          <Clock size={36} style={{ color: 'var(--c-sky-blue)' }} />
        </div>

        <div className={`kpi-card ${kpiPulsing ? 'pulse-update' : ''}`}>
          <div>
            <div className="kpi-lbl">Tasa de Resueltos</div>
            <div className="kpi-val" style={{ color: 'var(--c-steel-cyan)' }}>{resolutionRate}%</div>
          </div>
          <div className="kpi-circle">{resolutionRate}%</div>
        </div>

        <div className={`kpi-card kpi-card-gradient-2 ${kpiPulsing ? 'pulse-update' : ''}`}>
          <div>
            <div className="kpi-lbl">Resueltos / Cerrados</div>
            <div className="kpi-val">{resolvedTickets}</div>
          </div>
          <CheckCircle2 size={36} style={{ opacity: 0.85 }} />
        </div>
      </div>

      {/* Category Pills Bar with Dynamic Counters & Red Alert Badges */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-navy-rich)', marginRight: '0.3rem' }}>
          Filtrar Área / Categoría:
        </span>

        {categories.map((cat) => {
          const { total, newCount } = getCategoryMetrics(cat.key);
          const isActive = categoryFilter === cat.key;

          return (
            <button
              key={cat.key}
              className={`pill-button ${isActive ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.key)}
            >
              <span>{cat.label}</span>
              <span style={{ opacity: 0.75, fontSize: '0.75rem', fontWeight: 700 }}>({total})</span>
              {newCount > 0 && (
                <span className="pill-alert-badge" title={`${newCount} ticket(s) nuevo(s) sin atender`}>
                  {newCount}
                </span>
              )}
            </button>
          );
        })}

        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
          onClick={() => {
            window.open(`/api/export/tickets-csv?status=${statusFilter}&category=${categoryFilter}`, '_blank');
          }}
        >
          Exportar Reporte CSV
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="dashboard-grid">
        <TicketList
          tickets={tickets}
          selectedTicketId={selectedTicket?.id}
          onSelectTicket={handleSelectTicket}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <TicketChat
          ticket={selectedTicket}
          onSendReply={handleSendReply}
          onUpdateStatus={handleUpdateStatus}
          onUpdateCategory={handleUpdateCategory}
        />
      </div>
    </div>
  );
};
