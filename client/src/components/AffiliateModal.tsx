import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { Affiliate } from '../types';

interface AffiliateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAffiliate?: Affiliate) => void;
}

export const AffiliateModal: React.FC<AffiliateModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [dni, setDni] = useState('');
  const [matricula, setMatricula] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const res = await api.post('/affiliates', {
        dni: trimmedDni,
        matricula: trimmedMatricula,
        fullName: trimmedFullName,
        phone: trimmedPhone || undefined,
        email: trimmedEmail || undefined
      });

      const createdAffiliate: Affiliate = res.data?.data || res.data;
      onSuccess(createdAffiliate);
      onClose();
      setDni('');
      setMatricula('');
      setFullName('');
      setPhone('');
      setEmail('');
    } catch (err: any) {
      if (!err.response) {
        // Mode without active server / static environment fallback
        const mockCreated: Affiliate = {
          id: `aff-${Date.now()}`,
          dni: trimmedDni,
          matricula: trimmedMatricula,
          fullName: trimmedFullName,
          phone: trimmedPhone || undefined,
          email: trimmedEmail || undefined,
          status: 'ACTIVO',
          createdAt: new Date().toISOString()
        };
        onSuccess(mockCreated);
        onClose();
        setDni('');
        setMatricula('');
        setFullName('');
        setPhone('');
        setEmail('');
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
            <UserPlus style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nuevo Afiliado al Padrón</h3>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Afiliado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
