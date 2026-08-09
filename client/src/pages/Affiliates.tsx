import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Upload, RefreshCw, AlertCircle, Edit2, Trash2, Users, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { Affiliate } from '../types';
import { AffiliateModal } from '../components/AffiliateModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

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
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | undefined>(undefined);
  const [deleteAffiliateTarget, setDeleteAffiliateTarget] = useState<Affiliate | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAffiliates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/affiliates', { params: { search: search || undefined } });
      const raw = res?.data;
      const list: Affiliate[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
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

  const handleEdit = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setIsAddModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteAffiliateTarget) return;
    const id = deleteAffiliateTarget.id;
    setDeleting(true);
    try {
      await api.delete(`/affiliates/${id}`);
      setAffiliates(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.filter(a => a.id !== id);
      });
      setMessage('✅ Afiliado eliminado correctamente');
    } catch (err: any) {
      if (!err.response) {
        setAffiliates(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.filter(a => a.id !== id);
        });
        setMessage('✅ Afiliado eliminado (modo simulación)');
      } else {
        setMessage(`❌ ${err.response?.data?.error || 'Error al eliminar afiliado'}`);
      }
    } finally {
      setDeleting(false);
      setDeleteAffiliateTarget(undefined);
    }
  };

  const safeList = Array.isArray(affiliates) ? affiliates : [];
  const totalCount = safeList.length;
  const activeCount = safeList.filter(a => a.status === 'ACTIVO' || !a.status).length;
  const inactiveCount = safeList.filter(a => a.status === 'INACTIVO' || a.status === 'SUSPENDIDO').length;

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

          <button className="btn btn-primary" onClick={() => {
            setSelectedAffiliate(undefined);
            setIsAddModalOpen(true);
          }}>
            <UserPlus size={18} />
            <span>Nuevo Afiliado</span>
          </button>
        </div>
      </div>

      {/* KPI Header Cards */}
      <div className="kpi-row" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card kpi-card-gradient-1">
          <div>
            <div className="kpi-val">{totalCount}</div>
            <div className="kpi-lbl">Total Matriculados</div>
          </div>
          <div className="kpi-circle">
            <Users size={20} />
          </div>
        </div>

        <div className="kpi-card kpi-card-gradient-2">
          <div>
            <div className="kpi-val">{activeCount}</div>
            <div className="kpi-lbl">Afiliados Activos</div>
          </div>
          <div className="kpi-circle">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-val" style={{ color: 'var(--c-navy-dark)' }}>{inactiveCount}</div>
            <div className="kpi-lbl">Inactivos / Suspendidos</div>
          </div>
          <div className="kpi-circle" style={{ borderColor: '#f59e0b', color: '#b45309' }}>
            <XCircle size={20} />
          </div>
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
                  <th>Acciones</th>
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
                      {aff.status === 'SUSPENDIDO' ? (
                        <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                          SUSPENDIDO
                        </span>
                      ) : aff.status === 'INACTIVO' ? (
                        <span className="badge badge-cerrado">
                          INACTIVO
                        </span>
                      ) : (
                        <span className="badge badge-resuelto">
                          ACTIVO
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                          onClick={() => handleEdit(aff)}
                          title="Editar Afiliado"
                        >
                          <Edit2 size={15} />
                          <span>Editar</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => setDeleteAffiliateTarget(aff)}
                          title="Eliminar Afiliado"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
        initialData={selectedAffiliate}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedAffiliate(undefined);
        }}
        onSuccess={(newAffiliate) => {
          fetchAffiliates();
          if (newAffiliate) {
            setAffiliates((prev) => {
              const safePrev = Array.isArray(prev) ? prev : [];
              return [newAffiliate, ...safePrev.filter((a) => a.id !== newAffiliate.id)];
            });
          }
        }}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteAffiliateTarget}
        affiliate={deleteAffiliateTarget}
        loading={deleting}
        onClose={() => setDeleteAffiliateTarget(undefined)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
