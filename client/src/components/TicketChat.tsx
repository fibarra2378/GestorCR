import React, { useState } from 'react';
import { Send, UserCheck, MessageSquare, CheckCircle, Tag } from 'lucide-react';
import { Ticket, TicketStatus, TicketCategory } from '../types';

interface TicketChatProps {
  ticket: Ticket | null;
  onSendReply: (ticketId: string, message: string) => Promise<void>;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  onUpdateCategory: (ticketId: string, category: TicketCategory) => Promise<void>;
}

export const TicketChat: React.FC<TicketChatProps> = ({
  ticket,
  onSendReply,
  onUpdateStatus,
  onUpdateCategory
}) => {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  if (!ticket) {
    return (
      <div className="chat-pane" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
        <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Seleccione un ticket para iniciar la atención</h3>
        <p style={{ fontSize: '0.85rem' }}>Podrá visualizar el historial de WhatsApp y enviar respuestas directamente.</p>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    try {
      await onSendReply(ticket.id, replyText.trim());
      setReplyText('');
    } finally {
      setSending(false);
    }
  };

  const handleQuickTemplate = (template: string) => {
    setReplyText((prev) => (prev ? `${prev}\n${template}` : template));
  };

  return (
    <div className="chat-pane">
      {/* Header */}
      <div className="chat-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              {ticket.affiliate ? ticket.affiliate.fullName : 'Afiliado No Identificado'}
            </h2>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
              [{ticket.code}]
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>📱 {ticket.phone}</span>
            {ticket.affiliate && (
              <>
                <span>🪪 DNI: {ticket.affiliate.dni}</span>
                <span>🎓 Matrícula: {ticket.affiliate.matricula}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Category Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Tag size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
              value={ticket.category}
              onChange={(e) => onUpdateCategory(ticket.id, e.target.value as TicketCategory)}
            >
              <option value="CONSULTA">Consulta General</option>
              <option value="RECLAMO">Reclamo</option>
              <option value="MATRICULA">Trámite Matrícula</option>
              <option value="CUOTA">Facturación / Cuota</option>
              <option value="OTROS">Otros</option>
            </select>
          </div>

          {/* Status Selector */}
          <select
            className="form-control"
            style={{ fontWeight: 700, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
            value={ticket.status}
            onChange={(e) => onUpdateStatus(ticket.id, e.target.value as TicketStatus)}
          >
            <option value="NUEVO">Nuevo</option>
            <option value="EN_REVISION">En Revisión</option>
            <option value="PENDIENTE_AFILIADO">Pendiente Afiliado</option>
            <option value="RESUELTO">Resuelto</option>
            <option value="CERRADO">Cerrado</option>
          </select>
        </div>
      </div>

      {/* Messages Timeline */}
      <div className="chat-messages-area">
        {ticket.messages && ticket.messages.length > 0 ? (
          ticket.messages.map((msg) => (
            <div key={msg.id} className={`message-bubble-wrapper ${msg.sender.toLowerCase()}`}>
              <div className="message-bubble">
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.body}</p>
              </div>
              <div className="message-meta">
                <span>{msg.sender === 'AFILIADO' ? 'Afiliado' : msg.sender === 'OPERADOR' ? 'Operador Colegio' : 'Bot Colegio'}</span>
                {' • '}
                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
            No hay mensajes registrados en este ticket.
          </div>
        )}
      </div>

      {/* Quick Templates Bar */}
      <div style={{ padding: '0.5rem 1.5rem', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center' }}>Respuestas Rápidas:</span>
        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          onClick={() => handleQuickTemplate('Estimado/a, su solicitud se encuentra en proceso de revisión por la comisión directiva.')}
        >
          En Proceso
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          onClick={() => handleQuickTemplate('Por favor, adjunte el comprobante de pago en formato PDF o foto legíble.')}
        >
          Pedir Comprobante
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          onClick={() => handleQuickTemplate('Su trámite ha sido resuelto con éxito. ¿Podemos ayudarle en algo más?')}
        >
          Trámite Resuelto
        </button>
      </div>

      {/* Input Area */}
      <form className="chat-input-area" onSubmit={handleSend}>
        <textarea
          placeholder="Escriba su respuesta al WhatsApp del afiliado..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />

        <button type="submit" className="btn btn-primary" style={{ height: '48px' }} disabled={sending || !replyText.trim()}>
          <Send size={18} />
          <span>{sending ? 'Enviando...' : 'Enviar por WhatsApp'}</span>
        </button>
      </form>
    </div>
  );
};
