import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Affiliate } from '../types';
import { AffiliateModal } from '../components/AffiliateModal';

const MOCK_DEMO_AFFILIATES: Affiliate[] = [
  { id: 'aff-1', dni: '123456789', matricula: 'MAT-9921', fullName: 'Fernando Ibarra', email: 'fernandoibarra23@gmail.com', phone: '342-4112233', status: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: 'aff-2', dni: '33445566', matricula: 'MAT-4412', fullName: 'Carlos Spadaro', email: 'carlos.spadaro@gmail.com', phone: '342-5998877', status: 'ACTIVO', createdAt: new Date().toISOString() },
  { id: 'aff-3', dni: '28990112', matricula: 'MAT-1102', fullName: 'Laura Rossi', email: 'laura.rossi@gmail.com', phone: '342-4556677', status: 'ACTIVO', createdAt: new Date().toISOString() }
];

export const Affiliates: React.FC = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAffiliates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/affiliates', { params: { search: search || undefined } });
      // Defensive: handle both res.data (array) and res.data.data (wrapped)
      const raw = res?.data;
      const list: Affiliate[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      if (list.length === 0) throw new Error('Empty — switching to demo');
      setAffiliates(list);
    } catch (err) {
      // Fallback demo data
      let filtered = [...MOCK_DEMO_AFFILIATES];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(a =>
          a.dni.includes(search) ||
          a.matricula.toLowerCase().includes(q) ||
          a.fullName.toLowerCase().includes(q)
        );
      }
      setAffiliates(filtered);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAffiliates();
  }, [search]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setMessage('');
    try {
      const res = await api.post('/affiliates/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(res.data.message);
      fetchAffiliates();
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.error || 'Error al importar CSV'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Padrón de Afiliados</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Colegio de Fonoaudiólogos — Base de datos oficial de matriculados
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={18} />
            <span>{uploading ? 'Importando CSV...' : 'Importar CSV Padrón'}</span>
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
          </label>

          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size={18} />
            <span>Nuevo Afiliado</span>
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-hover)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="search-input-wrapper" style={{ width: '320px' }}>
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por DNI, Matrícula o Nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-secondary" onClick={fetchAffiliates}>
          <RefreshCw size={16} />
          <span>Actualizar</span>
        </button>
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando padrón...</div>
        ) : (() => {
          const safeAffiliates = Array.isArray(affiliates) ? affiliates : [];
          if (safeAffiliates.length === 0) {
            return (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>No se encontraron afiliados registrados.</p>
              </div>
            );
          }
          return (
            <table className="data-table">
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Matrícula</th>
                  <th>Nombre Completo</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {safeAffiliates.map((aff) => (
                  <tr key={aff.id}>
                    <td style={{ fontWeight: 700 }}>{aff.dni}</td>
                    <td>
                      <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-hover)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.8rem' }}>
                        {aff.matricula}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{aff.fullName}</td>
                    <td>{aff.phone || <span style={{ color: 'var(--text-muted)' }}>No vinculado</span>}</td>
                    <td>{aff.email || '-'}</td>
                    <td>
                      <span className={`badge ${aff.status === 'ACTIVO' ? 'badge-resuelto' : 'badge-cerrado'}`}>
                        {aff.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>

      <AffiliateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchAffiliates}
      />
    </div>
  );
};
