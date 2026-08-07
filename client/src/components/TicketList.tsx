import React from 'react';
import { Search, Filter, MessageSquare, AlertCircle } from 'lucide-react';
import { Ticket, TicketStatus } from '../types';

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId?: string;
  onSelectTicket: (ticket: Ticket) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}) => {
  const getBadgeClass = (status: TicketStatus) => {
    switch (status) {
      case 'NUEVO': return 'badge-nuevo';
      case 'EN_REVISION': return 'badge-en_revision';
      case 'PENDIENTE_AFILIADO': return 'badge-pendiente_afiliado';
      case 'RESUELTO': return 'badge-resuelto';
      case 'CERRADO': return 'badge-cerrado';
      default: return 'badge-cerrado';
    }
  };

  const formatStatus = (status: TicketStatus) => {
    switch (status) {
      case 'NUEVO': return 'Nuevo';
      case 'EN_REVISION': return 'En Revisión';
      case 'PENDIENTE_AFILIADO': return 'Pend. Afiliado';
      case 'RESUELTO': return 'Resuelto';
      case 'CERRADO': return 'Cerrado';
      default: return status;
    }
  };

  return (
    <div className="tickets-column">
      <div className="tickets-filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por DNI, Matrícula, Nombre o Ticket..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-control"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="NUEVO">Nuevos</option>
            <option value="EN_REVISION">En Revisión</option>
            <option value="PENDIENTE_AFILIADO">Pendiente Afiliado</option>
            <option value="RESUELTO">Resueltos</option>
          </select>
        </div>
      </div>

      <div className="tickets-scroll-area">
        {tickets.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem' }}>No se encontraron tickets con esos criterios.</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const isSelected = ticket.id === selectedTicketId;
            const lastMsg = ticket.messages && ticket.messages.length > 0 ? ticket.messages[0].body : '';
            const affiliateName = ticket.affiliate ? ticket.affiliate.fullName : 'Afiliado No Identificado';

            return (
              <div
                key={ticket.id}
                className={`ticket-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectTicket(ticket)}
              >
                <div className="ticket-card-header">
                  <span className="ticket-code">{ticket.code}</span>
                  <span className={`badge ${getBadgeClass(ticket.status)}`}>
                    {formatStatus(ticket.status)}
                  </span>
                </div>

                <div className="ticket-card-title">{affiliateName}</div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>✉️ Email</span>
                  <span style={{ fontWeight: 600 }}>{ticket.email || ticket.phone}</span>

                  {ticket.affiliate?.matricula && (
                    <span style={{ backgroundColor: 'var(--bg-main)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      {ticket.affiliate.matricula}
                    </span>
                  )}
                </div>


                <div className="ticket-card-preview">
                  <MessageSquare size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {lastMsg || 'Sin mensajes'}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
