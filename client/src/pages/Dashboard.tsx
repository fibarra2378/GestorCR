import React, { useState, useEffect } from 'react';
import { TicketList } from '../components/TicketList';
import { TicketChat } from '../components/TicketChat';
import { TicketsService } from '../services/ticketsService';
import { Ticket, TicketStatus, TicketCategory } from '../types';
import { Ticket as TicketIcon, Clock, CheckCircle2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
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

  useEffect(() => {
    setLoading(true);
    const unsubscribe = TicketsService.subscribeTickets((list) => {
      setAllTickets(list);
      setLoading(false);
      triggerKpiPulse();

      // If a ticket is currently selected, update its reference with latest data
      if (selectedTicket) {
        const found = list.find((t) => t.id === selectedTicket.id);
        if (found) setSelectedTicket(found);
      }
    });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  useEffect(() => {
    let filtered = [...allTickets];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.code.toLowerCase().includes(q) ||
          t.phone.toLowerCase().includes(q) ||
          (t.email && t.email.toLowerCase().includes(q)) ||
          (t.affiliate?.fullName || '').toLowerCase().includes(q) ||
          (t.affiliate?.dni || '').includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    setTickets(filtered);

    // Auto-select first ticket if none is selected
    if (!selectedTicket && filtered.length > 0) {
      setSelectedTicket(filtered[0]);
    }
  }, [searchQuery, statusFilter, categoryFilter, allTickets]);

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    if (ticket.status === 'NUEVO') {
      await TicketsService.updateStatus(ticket.id, 'EN_REVISION');
    }
  };

  const handleSendReply = async (ticketId: string, body: string) => {
    try {
      await TicketsService.sendReply(ticketId, body);
    } catch (err) {
      console.error('Error al enviar respuesta:', err);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      await TicketsService.updateStatus(ticketId, status);
      triggerKpiPulse();
    } catch (err) {
      console.error('Error al actualizar estado:', err);
    }
  };

  const handleUpdateCategory = async (ticketId: string, category: TicketCategory) => {
    try {
      await TicketsService.updateCategory(ticketId, category);
      triggerKpiPulse();
    } catch (err) {
      console.error('Error al actualizar categoría:', err);
    }
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFCódigo,Teléfono/Email,Afiliado,DNI,Matrícula,Categoría,Estado,Prioridad,Fecha\n';
    const listToExport = tickets;

    for (const t of listToExport) {
      const affName = t.affiliate ? `"${t.affiliate.fullName.replace(/"/g, '""')}"` : 'Sin Vincular';
      const dni = t.affiliate?.dni || '';
      const mat = t.affiliate?.matricula || '';
      const date = t.createdAt ? t.createdAt.replace('T', ' ').substring(0, 19) : '';
      csv += `${t.code},${t.email || t.phone},${affName},${dni},${mat},${t.category},${t.status},${t.priority},${date}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GestorCR_Tickets_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // KPI Calculations based on allTickets
  const safeAllTickets = Array.isArray(allTickets) ? allTickets : [];
  const safeTickets = Array.isArray(tickets) ? tickets : [];

  const totalTickets = safeAllTickets.length;
  const activeTickets = safeAllTickets.filter((t) => t && (t.status === 'NUEVO' || t.status === 'EN_REVISION' || t.status === 'PENDIENTE_AFILIADO')).length;
  const resolvedTickets = safeAllTickets.filter((t) => t && (t.status === 'RESUELTO' || t.status === 'CERRADO')).length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100;

  // Category Badges & Unattended Count Calculator
  const getCategoryMetrics = (catKey: string) => {
    if (catKey === 'ALL') {
      const total = safeAllTickets.length;
      const newCount = safeAllTickets.filter((t) => t && t.status === 'NUEVO').length;
      return { total, newCount };
    }
    const filtered = safeAllTickets.filter((t) => t && t.category === catKey);
    const total = filtered.length;
    const newCount = filtered.filter((t) => t && t.status === 'NUEVO').length;
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
          onClick={handleExportCSV}
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
