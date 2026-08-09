import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit2 } from 'lucide-react';
import { api } from '../services/api';
import { Affiliate } from '../types';

interface AffiliateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAffiliate?: Affiliate) => void;
  initialData?: Affiliate;
}

export const AffiliateModal: React.FC<AffiliateModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [dni, setDni] = useState('');
  const [matricula, setMatricula] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO'>('ACTIVO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDni(initialData.dni || '');
        setMatricula(initialData.matricula || '');
        setFullName(initialData.fullName || '');
        setPhone(initialData.phone || '');
        setEmail(initialData.email || '');
        setStatus((initialData.status as any) || 'ACTIVO');
      } else {
        setDni('');
        setMatricula('');
        setFullName('');
        setPhone('');
        setEmail('');
        setStatus('ACTIVO');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedDni = dni.trim();
    const trimmedMatricula = matricula.trim();
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedDni || !trimmedMatricula || !trimmedFullName) {
      setError('DNI, Matrícula y Nombre completo son obligatorios');
      return;
    }

    setLoading(true);
    try {
      let res;
      const payload = {
        dni: trimmedDni,
        matricula: trimmedMatricula,
        fullName: trimmedFullName,
        phone: trimmedPhone || undefined,
        email: trimmedEmail || undefined,
        status
      };

      if (initialData) {
        res = await api.patch(`/affiliates/${initialData.id}`, payload);
      } else {
        res = await api.post('/affiliates', payload);
      }

      const createdAffiliate: Affiliate = res.data?.data || res.data;
      onSuccess(createdAffiliate);
      onClose();
    } catch (err: any) {
      if (!err.response) {
        // Mode without active server / static environment fallback
        const mockCreated: Affiliate = {
          id: initialData ? initialData.id : `aff-${Date.now()}`,
          dni: trimmedDni,
          matricula: trimmedMatricula,
          fullName: trimmedFullName,
          phone: trimmedPhone || undefined,
          email: trimmedEmail || undefined,
          status: status || (initialData ? initialData.status : 'ACTIVO'),
          createdAt: initialData ? initialData.createdAt : new Date().toISOString()
        };
        onSuccess(mockCreated);
        onClose();
        return;
      }
      setError(err.response?.data?.error || 'Error al guardar afiliado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {initialData ? <Edit2 style={{ color: 'var(--primary)' }} /> : <UserPlus style={{ color: 'var(--primary)' }} />}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {initialData ? 'Editar Afiliado' : 'Nuevo Afiliado al Padrón'}
            </h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.6rem 0.85rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>DNI *</label>
            <input
              type="text"
              className="form-control"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ej: 32456789"
              required
            />
          </div>

          <div className="form-group">
            <label>Número de Matrícula *</label>
            <input
              type="text"
              className="form-control"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ej: M-1042"
              required
            />
          </div>

          <div className="form-group">
            <label>Nombre y Apellido Completo *</label>
            <input
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Dra. Valeria Benítez"
              required
            />
          </div>

          <div className="form-group">
            <label>Teléfono (WhatsApp)</label>
            <input
              type="text"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 5491144445555"
            />
          </div>

          <div className="form-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="valeria@fonoaudiologia.org"
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Estado en Padrón
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { id: 'ACTIVO', label: 'Activo', bg: 'var(--c-ice-bg)', color: 'var(--c-navy-rich)' },
                { id: 'INACTIVO', label: 'Inactivo', bg: '#f3f4f6', color: '#4b5563' },
                { id: 'SUSPENDIDO', label: 'Suspendido', bg: '#fef3c7', color: '#92400e' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatus(st.id as any)}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.5rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    border: status === st.id ? '2px solid var(--c-navy-rich)' : '1px solid var(--border)',
                    backgroundColor: status === st.id ? 'var(--c-navy-rich)' : st.bg,
                    color: status === st.id ? '#ffffff' : st.color,
                    transition: 'all 0.2s ease',
                    boxShadow: status === st.id ? '0 2px 8px rgba(10, 65, 116, 0.25)' : 'none'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Registrar Afiliado')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
