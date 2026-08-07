import React, { useState, useEffect } from 'react';
import { TicketList } from '../components/TicketList';
import { TicketChat } from '../components/TicketChat';
import { api, WSSubscription } from '../services/api';
import { Ticket, TicketStatus, TicketCategory } from '../types';
import { Ticket as TicketIcon, Clock, CheckCircle2, Users } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets', {
        params: {
          search: searchQuery,
          status: statusFilter,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined
        }
      });
      setTickets(res.data.data);

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
        fetchTickets();
      } else if (event.type === 'NEW_MESSAGE') {
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
  };

  const handleSendReply = async (ticketId: string, body: string) => {
    await api.post(`/tickets/${ticketId}/reply`, { body });
    await fetchTicketDetails(ticketId);
    await fetchTickets();
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    await api.patch(`/tickets/${ticketId}`, { status });
    await fetchTicketDetails(ticketId);
    await fetchTickets();
  };

  const handleUpdateCategory = async (ticketId: string, category: TicketCategory) => {
    await api.patch(`/tickets/${ticketId}`, { category });
    await fetchTicketDetails(ticketId);
    await fetchTickets();
  };

  // KPI Calculations
  const totalTickets = tickets.length;
  const activeTickets = tickets.filter((t) => t.status === 'NUEVO' || t.status === 'EN_REVISION').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'RESUELTO' || t.status === 'CERRADO').length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
      {/* Top KPI Header Row inspired by reference dashboard */}
      <div className="kpi-row">
        <div className="kpi-card kpi-card-gradient-1">
          <div>
            <div className="kpi-lbl">Tickets Totales</div>
            <div className="kpi-val">{totalTickets}</div>
          </div>
          <TicketIcon size={36} style={{ opacity: 0.8 }} />
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-lbl">En Atención / Nuevos</div>
            <div className="kpi-val" style={{ color: 'var(--c-navy-rich)' }}>{activeTickets}</div>
          </div>
          <Clock size={36} style={{ color: 'var(--c-sky-blue)' }} />
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-lbl">Tasa de Resueltos</div>
            <div className="kpi-val" style={{ color: 'var(--c-steel-cyan)' }}>{resolutionRate}%</div>
          </div>
          <div className="kpi-circle">{resolutionRate}%</div>
        </div>

        <div className="kpi-card kpi-card-gradient-2">
          <div>
            <div className="kpi-lbl">Resueltos / Cerrados</div>
            <div className="kpi-val">{resolvedTickets}</div>
          </div>
          <CheckCircle2 size={36} style={{ opacity: 0.85 }} />
        </div>
      </div>

      {/* Category Pills Bar matching reference image */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-navy-rich)', marginRight: '0.5rem' }}>
          Filtrar Área / Categoría:
        </span>

        <button
          className={`pill-button ${categoryFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('ALL')}
        >
          Todas las Áreas
        </button>
        <button
          className={`pill-button ${categoryFilter === 'CONSULTA' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('CONSULTA')}
        >
          Consultas Generales
        </button>
        <button
          className={`pill-button ${categoryFilter === 'RECLAMO' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('RECLAMO')}
        >
          Reclamos
        </button>
        <button
          className={`pill-button ${categoryFilter === 'MATRICULA' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('MATRICULA')}
        >
          Matrículas
        </button>
        <button
          className={`pill-button ${categoryFilter === 'CUOTA' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('CUOTA')}
        >
          Cuotas / Facturación
        </button>

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
