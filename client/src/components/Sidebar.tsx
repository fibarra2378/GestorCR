import React from 'react';
import { LayoutDashboard, Users, Smartphone, LogOut, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  currentTab: 'tickets' | 'affiliates';
  onSelectTab: (tab: 'tickets' | 'affiliates') => void;
  onOpenSimulator: () => void;
  onOpenUsers?: () => void;
  onLogout: () => void;
  user: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSimulator,
  onOpenUsers,
  onLogout,
  user
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">CF</div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>GestorCR</h3>
          <p style={{ fontSize: '0.75rem', color: '#BDD8E9', fontWeight: 600 }}>Colegio Fonoaudiólogos</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentTab === 'tickets' ? 'active' : ''}`}
          onClick={() => onSelectTab('tickets')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard & Tickets</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'affiliates' ? 'active' : ''}`}
          onClick={() => onSelectTab('affiliates')}
        >
          <Users size={20} />
          <span>Padrón Afiliados</span>
        </button>

        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(123, 189, 232, 0.15)', paddingTop: '1rem' }}>
          {user?.role === 'ADMIN' && onOpenUsers && (
            <button
              className="nav-item"
              style={{ width: '100%', marginBottom: '0.5rem', color: '#7BBDE8' }}
              onClick={onOpenUsers}
            >
              <ShieldCheck size={20} />
              <span>Gestión Operadores</span>
            </button>
          )}

          <button
            className="nav-item"
            style={{
              width: '100%',
              color: '#ffffff',
              background: 'linear-gradient(135deg, rgba(123, 189, 232, 0.25) 0%, rgba(78, 142, 162, 0.3) 100%)',
              border: '1px solid rgba(123, 189, 232, 0.4)',
              marginBottom: '0.75rem'
            }}
            onClick={onOpenSimulator}
          >
            <Smartphone size={20} style={{ color: '#7BBDE8' }} />
            <span>Simulador WhatsApp</span>
          </button>

          <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 29, 57, 0.4)', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7BBDE8', fontSize: '0.75rem', fontWeight: 700 }}>
              <ShieldCheck size={14} />
              <span>{user?.role || 'OPERADOR'}</span>
            </div>
            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>{user?.name || 'Operador'}</p>
          </div>

          <button className="nav-item" onClick={onLogout} style={{ width: '100%', color: '#fca5a5' }}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

