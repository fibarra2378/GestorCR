import React, { useState, useEffect } from 'react';
import { TicketList } from '../components/TicketList';
import { TicketChat } from '../components/TicketChat';
import { api, WSSubscription } from '../services/api';
import { Ticket, TicketStatus, TicketCategory } from '../types';
import { Ticket as TicketIcon, Clock, CheckCircle2 } from 'lucide-react';

const MOCK_DEMO_TICKETS: Ticket[] = [
  {
    id: 'tick-1',
    code: 'TICK-358189',
    phone: 'fernandoibarra23@gmail.com',
    email: 'fernandoibarra23@gmail.com',
    channel: 'EMAIL',
    category: 'CONSULTA',
    status: 'NUEVO',
    priority: 'MEDIA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    affiliate: {
      id: 'aff-1',
      dni: '123456789',
      matricula: 'MAT-9921',
      fullName: 'Fernando Ibarra',
      email: 'fernandoibarra23@gmail.com',
      status: 'ACTIVO',
      createdAt: new Date().toISOString()
    },
    messages: [
      { id: 'm-1', ticketId: 'tick-1', sender: 'AFILIADO', body: '[Email: Consulta] Consulta sobre certificado de matrícula 2026', createdAt: new Date().toISOString() }
    ]
  },
  {
    id: 'tick-2',
    code: 'TICK-455970',
    phone: 'carlos.spadaro@gmail.com',
    email: 'carlos.spadaro@gmail.com',
    channel: 'EMAIL',
    category: 'RECLAMO',
    status: 'NUEVO',
    priority: 'ALTA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    affiliate: {
      id: 'aff-2',
      dni: '33445566',
      matricula: 'MAT-4412',
      fullName: 'Carlos Spadaro',
      email: 'carlos.spadaro@gmail.com',
      status: 'ACTIVO',
      createdAt: new Date().toISOString()
    },
    messages: [
      { id: 'm-2', ticketId: 'tick-2', sender: 'AFILIADO', body: '[Email: Reclamo] Reclamo de acreditación de pago de cuota mensual', createdAt: new Date().toISOString() }
    ]
  },
  {
    id: 'tick-3',
    code: 'TICK-392319',
    phone: 'laura.rossi@gmail.com',
    email: 'laura.rossi@gmail.com',
    channel: 'EMAIL',
    category: 'MATRICULA',
    status: 'EN_REVISION',
    priority: 'MEDIA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    affiliate: {
      id: 'aff-3',
      dni: '28990112',
      matricula: 'MAT-1102',
      fullName: 'Laura Rossi',
      email: 'laura.rossi@gmail.com',
      status: 'ACTIVO',
      createdAt: new Date().toISOString()
    },
    messages: [
      { id: 'm-3', ticketId: 'tick-3', sender: 'AFILIADO', body: 'Solicitud de constancia de ética profesional para trámite externo', createdAt: new Date().toISOString() }
    ]
  }
];

export const Dashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]); // Unfiltered tickets for global KPI calculation
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [kpiPulsing, setKpiPulsing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Detect if running in static Firebase Hosting (no backend available)
  const isStaticHosting = (
    window.location.hostname.includes('web.app') ||
    window.location.hostname.includes('firebaseapp.com')
  );

  const triggerKpiPulse = () => {
    setKpiPulsing(true);
    setTimeout(() => setKpiPulsing(false), 1200);
  };

  const fetchTickets = async () => {
    try {
      // Helper para extraer array de cualquier forma de respuesta
      const extractArray = (res: any): Ticket[] => {
        const raw = res?.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      };

      // 1. Fetch filtered tickets for the list
      const res = await api.get('/tickets', {
        params: {
          search: searchQuery || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined
        }
      });
      const filteredList = extractArray(res);

      // 2. Fetch all tickets without filters to compute global KPI cards & category badges
      const allRes = await api.get('/tickets');
      const fullList = extractArray(allRes);

      setTickets(filteredList);
      setAllTickets(fullList);

      if (selectedTicket) {
        const updated = filteredList.find((t: Ticket) => t.id === selectedTicket.id);
        if (updated) fetchTicketDetails(updated.id);
      }
    } catch (err) {
      // Fallback: backend offline or static hosting — load demo data
      console.warn('Backend indisponible. Cargando datos demostrativos.');
      let demoList = [...MOCK_DEMO_TICKETS];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        demoList = demoList.filter(t =>
          t.code.toLowerCase().includes(q) ||
          t.phone.toLowerCase().includes(q) ||
          (t.affiliate?.fullName || '').toLowerCase().includes(q)
        );
      }
      if (statusFilter !== 'ALL') demoList = demoList.filter(t => t.status === statusFilter);
      if (categoryFilter !== 'ALL') demoList = demoList.filter(t => t.category === categoryFilter);

      setTickets(demoList);
      setAllTickets([...MOCK_DEMO_TICKETS]);
      if (!selectedTicket && demoList.length > 0) {
        setSelectedTicket(demoList[0]);
      }
    } finally {
      setLoading(false);
    }
  };


  const fetchTicketDetails = async (id: string) => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setSelectedTicket(res.data.data);
    } catch (err) {
      const found = MOCK_DEMO_TICKETS.find(t => t.id === id);
      if (found) setSelectedTicket(found);
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
    try {
      await api.post(`/tickets/${ticketId}/reply`, { body });
      await fetchTicketDetails(ticketId);
      await fetchTickets();
    } catch (err) {
      if (selectedTicket && selectedTicket.id === ticketId) {
        const newMsg = { id: `m_${Date.now()}`, ticketId, sender: 'OPERADOR' as const, body, createdAt: new Date().toISOString() };
        const updatedMsgs = [...(selectedTicket.messages || []), newMsg];
        const updatedTicket = { ...selectedTicket, status: 'PENDIENTE_AFILIADO' as const, messages: updatedMsgs };
        setSelectedTicket(updatedTicket);
        setTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));
        setAllTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));
      }
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { status });
      triggerKpiPulse();
      await fetchTicketDetails(ticketId);
      await fetchTickets();
    } catch (err) {
      triggerKpiPulse();
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      setAllTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status } : null);
      }
    }
  };

  const handleUpdateCategory = async (ticketId: string, category: TicketCategory) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { category });
      triggerKpiPulse();
      await fetchTicketDetails(ticketId);
      await fetchTickets();
    } catch (err) {
      triggerKpiPulse();
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, category } : t));
      setAllTickets(prev => prev.map(t => t.id === ticketId ? { ...t, category } : t));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, category } : null);
      }
    }
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
