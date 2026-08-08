import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Affiliates } from './pages/Affiliates';
import { Login } from './pages/Login';
import { UsersModal } from './components/UsersModal';
import { Sun, Moon } from 'lucide-react';
import { api } from './services/api';


export const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'tickets' | 'affiliates'>('tickets');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const token = localStorage.getItem('gestorcr_token');
    const savedUser = localStorage.getItem('gestorcr_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        handleLogout();
      }
    }
    setLoading(false);
  }, []);


  const handleLoginSuccess = (userData: any, token: string) => {
    localStorage.setItem('gestorcr_token', token);
    localStorage.setItem('gestorcr_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('gestorcr_token');
    localStorage.removeItem('gestorcr_user');
    setUser(null);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (loading) return null;

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSimulator={() => {}}
        onOpenUsers={() => setIsUsersOpen(true)}
        onLogout={handleLogout}
        user={user}
      />

      <div className="main-content">
        <header className="top-bar">
          <div>
            <h1 className="top-bar-title">
              {currentTab === 'tickets' ? 'Dashboard — Gestión de Consultas y Reclamos' : 'Padrón de Afiliados'}
            </h1>
            <p className="top-bar-subtitle">
              Indicadores de atención y gestión de la matrícula profesional | Colegio de Fonoaudiólogos
            </p>
          </div>

          <div className="top-bar-actions">
            <button className="btn btn-secondary" onClick={toggleTheme} style={{ padding: '0.5rem 0.85rem' }}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {currentTab === 'tickets' && <Dashboard />}
        {currentTab === 'affiliates' && <Affiliates />}

        <UsersModal
          isOpen={isUsersOpen}
          onClose={() => setIsUsersOpen(false)}
        />
      </div>
    </div>
  );

};

export default App;

