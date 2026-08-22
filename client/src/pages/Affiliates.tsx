import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Upload, RefreshCw, AlertCircle, Edit2, Trash2, Users, CheckCircle2, XCircle } from 'lucide-react';
import { Affiliate } from '../types';
import { AffiliatesService } from '../services/affiliatesService';
import { AffiliateModal } from '../components/AffiliateModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

export const Affiliates: React.FC = () => {
  const [allAffiliates, setAllAffiliates] = useState<Affiliate[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | undefined>(undefined);
  const [deleteAffiliateTarget, setDeleteAffiliateTarget] = useState<Affiliate | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = AffiliatesService.subscribeAffiliates((list) => {
      setAllAffiliates(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setAffiliates(allAffiliates);
    } else {
      const q = search.toLowerCase().trim();
      const filtered = allAffiliates.filter(
        (a) =>
          a.dni.includes(q) ||
          a.matricula.toLowerCase().includes(q) ||
          a.fullName.toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q))
      );
      setAffiliates(filtered);
    }
  }, [search, allAffiliates]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');
    try {
      const text = await file.text();
      const result = await AffiliatesService.importFromCSVText(text);
      setMessage(`✅ Se importaron ${result.created} afiliados con éxito (${result.skipped} omitidos/duplicados).`);
    } catch (err: any) {
      setMessage(`❌ Error al importar archivo CSV: ${err.message}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
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
      await AffiliatesService.deleteAffiliate(id);
      setMessage('✅ Afiliado eliminado correctamente del padrón.');
    } catch (err: any) {
      setMessage(`❌ Error al eliminar afiliado: ${err.message}`);
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

        <button className="btn btn-secondary" onClick={() => AffiliatesService.getAffiliates().then(setAllAffiliates)}>
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
        onSuccess={() => {
          setMessage('✅ Padrón de afiliados actualizado correctamente.');
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
