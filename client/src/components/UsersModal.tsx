import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, User } from 'lucide-react';
import { api } from '../services/api';

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersModal: React.FC<UsersModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OPERADOR' | 'ADMIN'>('OPERADOR');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      const raw = res?.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setUsers(list);
    } catch (err: any) {
      // En hosting estático sin backend, mostrar lista vacía sin error
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/users', { username, name, password, role });
      setUsername('');
      setName('');
      setPassword('');
      setRole('OPERADOR');
      setShowAddForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear operador');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar al operador "${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar operador');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={26} style={{ color: 'var(--color-primary-medium)' }} />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-navy)' }}>Gestión de Operadores</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Administración de cuentas con acceso al Dashboard</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>

        {!showAddForm ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-dark-navy)' }}>
                Operadores Activos ({Array.isArray(users) ? users.length : 0})
              </span>
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ padding: '0.5rem 0.9rem' }}>
                <UserPlus size={16} />
                <span>Nuevo Operador</span>
              </button>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bg-hover)', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>Nombre</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>Usuario</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>Rol</th>
                    <th style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(users) ? users : []).map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                      <td style={{ padding: '0.75rem 0.8rem', fontWeight: 700, color: 'var(--color-dark-navy)' }}>{u.name}</td>
                      <td style={{ padding: '0.75rem 0.8rem', color: 'var(--text-muted)' }}>@{u.username}</td>
                      <td style={{ padding: '0.75rem 0.8rem' }}>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-urgent' : 'badge-media'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right' }}>
                        <button
                          className="btn"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          style={{ padding: '0.35rem', color: '#ef4444', background: 'transparent' }}
                          title="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateUser}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-dark-navy)' }}>
              Registrar Nuevo Operador
            </h4>

            {error && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label">Nombre Completo</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="Ej: Lic. Ana Martínez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="Ej: amartinez"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Rol del Sistema</label>
                <select className="select" value={role} onChange={(e: any) => setRole(e.target.value)}>
                  <option value="OPERADOR">OPERADOR (Gestión de Tickets)</option>
                  <option value="ADMIN">ADMIN (Acceso Total y Operadores)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar Operador
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
