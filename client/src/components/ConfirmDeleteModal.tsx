import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { Affiliate } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  affiliate?: Affiliate;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  affiliate,
  onClose,
  onConfirm,
  loading = false
}) => {
  if (!isOpen || !affiliate) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '440px', borderTop: '4px solid #ef4444' }}>
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626'
            }}>
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-navy-dark)' }}>
              Eliminar Afiliado
            </h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '0.2rem' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: '1.5' }}>
          <p style={{ marginBottom: '0.75rem' }}>
            ¿Estás seguro de que deseas eliminar permanentemente a este matriculado del padrón oficial?
          </p>
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--c-ice-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <span style={{ fontWeight: 800, color: 'var(--c-navy-dark)', fontSize: '1rem' }}>
              {affiliate.fullName}
            </span>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span>DNI: <strong>{affiliate.dni}</strong></span>
              <span>Matrícula: <strong>{affiliate.matricula}</strong></span>
            </div>
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>
            ⚠️ Esta acción es irreversible y removerá la vinculación de sus registros.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
            }}
          >
            <Trash2 size={16} />
            <span>{loading ? 'Eliminando...' : 'Sí, Eliminar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
