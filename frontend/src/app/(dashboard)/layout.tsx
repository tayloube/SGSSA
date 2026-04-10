'use client';
/**
 * Layout principal avec Sidebar — SGSSA
 * Protège toutes les routes authentifiées
 */
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Server, Database, Package, Globe, Shield,
  Users, LogOut, Menu, X, Bell, ChevronRight,
  Wifi, Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Tableau de bord',    icon: LayoutDashboard, section: null },
  { href: '/servers',       label: 'Serveurs',            icon: Server,         section: 'Infrastructure' },
  { href: '/racks',         label: 'Racks',               icon: Database,       section: 'Infrastructure' },
  { href: '/software',      label: 'Logiciels',           icon: Package,        section: 'Ressources' },
  { href: '/webapps',       label: 'Applications Web',   icon: Globe,          section: 'Ressources' },
  { href: '/certificates',  label: 'Certificats SSL',    icon: Shield,         section: 'Ressources' },
  { href: '/users',         label: 'Utilisateurs',       icon: Users,          section: 'Administration', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Déconnexion réussie');
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: 13 }}>Chargement...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!isAuthenticated) return null;

  // Regrouper par section
  const sections = Array.from(new Set(NAV_ITEMS.map(i => i.section).filter(Boolean)));

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    return true;
  });

  const renderNavItem = (item: (typeof NAV_ITEMS)[0]) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}>
        <Icon size={17} />
        <span>{item.label}</span>
        {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
      </Link>
    );
  };

  return (
    <div className="layout-wrapper">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 40, backdropFilter: 'blur(2px)'
        }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img 
              src="/gov-logo.png" 
              alt="Logo Gouvernement" 
              style={{ width: 42, height: 42, objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', letterSpacing: '0.02em' }}>SGSSA</div>
              <div style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.2, fontWeight: 500 }}>DDI — MTNIMA</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Dashboard en premier */}
          {filteredNavItems.filter(i => !i.section).map(renderNavItem)}

          {/* Sections groupées */}
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-title">{section}</div>
              {filteredNavItems.filter(i => i.section === section).map(renderNavItem)}
            </div>
          ))}
        </nav>

        {/* Profil utilisateur */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.03)'
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 13, color: 'white', flexShrink: 0
            }}>
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.nom_complet || user?.email}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 500, textTransform: 'capitalize',
                color: user?.role === 'admin' ? '#60a5fa' : '#94a3b8'
              }}>
                {user?.role}
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-icon" title="Déconnexion"
              style={{ padding: '6px', flexShrink: 0 }}>
              <LogOut size={14} />
            </button>
          </div>

          {/* Statut connexion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px 0', fontSize: 11, color: '#64748b' }}>
            <div className={`live-dot ${isOnline ? 'live-dot-green' : 'live-dot-red'}`} style={{ width: 6, height: 6 }} />
            {isOnline ? 'Connecté' : 'Hors ligne'}
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(v => !v)}
              style={{ display: 'none' }} id="mobile-menu-btn">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                {NAV_ITEMS.find(i => pathname.startsWith(i.href) && i.href !== '/')?.label || 'Tableau de bord'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
              <Wifi size={12} style={{ color: isOnline ? '#10b981' : '#ef4444' }} />
              Système{isOnline ? ' en ligne' : ' hors ligne'}
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </header>

        {/* Pages */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
