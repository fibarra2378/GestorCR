import React, { useState } from 'react';
import { X, Send, Smartphone } from 'lucide-react';
import { api } from '../services/api';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessMessage?: () => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  onSuccessMessage
}) => {
  const [phone, setPhone] = useState('5491144445555');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !phone.trim()) return;

    setLoading(true);
    const timeStr = new Date().toLocaleTimeString();
    try {
      const res = await api.post('/whatsapp/simulate-incoming', {
        phone: phone.trim(),
        message: message.trim()
      });

      const resMsg = res.data?.message || `Mensaje simulado enviado desde ${phone}`;
      setLogs((prev) => [`[${timeStr}] 📲 ${resMsg}`, ...prev]);
      setMessage('');
      if (onSuccessMessage) onSuccessMessage();
    } catch (err: any) {
      if (!err.response) {
        setLogs((prev) => [`[${timeStr}] 📲 Mensaje simulado (modo local): "${message.trim()}"`, ...prev]);
        setMessage('');
        if (onSuccessMessage) onSuccessMessage();
        return;
      }
      setLogs((prev) => [`[${timeStr}] ❌ Error: ${err.response?.data?.error || err.message}`, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Simulador de WhatsApp Entrante</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Simula el envío de mensajes desde el celular de un afiliado o usuario hacia la Meta Webhook de GestorCR sin necesidad de credenciales de produccion.
        </p>

        <form onSubmit={handleSend}>
          <div className="form-group">
            <label>Teléfono Emisor (wa_id)</label>
            <input
              type="text"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 5491144445555 (Afiliado existente) o 5491199998888 (Nuevo)"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              onClick={() => { setPhone('5491144445555'); setMessage('Consulta sobre renovación de matrícula profesional'); }}
            >
              Afiliado Existente
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              onClick={() => { setPhone('5491188887777'); setMessage('Hola quisiera comunicarme con el colegio'); }}
            >
              Nuevo Usuario
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              onClick={() => { setPhone('5491188887777'); setMessage('32456789'); }}
            >
              Validar DNI (32456789)
            </button>
          </div>

          <div className="form-group">
            <label>Mensaje de WhatsApp</label>
            <textarea
              className="form-control"
              style={{ height: '80px', resize: 'none' }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escriba el texto del mensaje..."
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            <Send size={16} />
            <span>{loading ? 'Simulando...' : 'Enviar Mensaje a Webhook'}</span>
          </button>
        </form>

        {logs.length > 0 && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Registro de Envíos:</p>
            <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.78rem', backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '0.25rem' }}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
