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
import AlertBanner from '@/components/AlertBanner';

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Tableau de bord',    icon: LayoutDashboard, section: null },
  { href: '/servers',       label: 'Serveurs',            icon: Server,         section: 'Infrastructure' },
  { href: '/racks',         label: 'Racks',               icon: Database,       section: 'Infrastructure' },
  { href: '/software',      label: 'Logiciels',           icon: Package,        section: 'Ressources' },
  { href: '/webapps',       label: 'Applications Web',   icon: Globe,          section: 'Ressources' },
  { href: '/certificates',  label: 'Certificats SSL',    icon: Shield,         section: 'Ressources' },
  { href: '/activities',    label: "Journal d'activités", icon: Activity,       section: 'Administration' },
  { href: '/users',         label: 'Utilisateurs',       icon: Users,          section: 'Administration', adminOnly: true },
];

type Notification = {
  id: string;
  type: 'capture' | 'alert' | 'status';
  title: string;
  message: string;
  time: Date;
  read: boolean;
  color: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('sgssa_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          time: new Date(n.time)
        })));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save to localStorage when notifications change
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem('sgssa_notifications', JSON.stringify(notifications));
      } catch (e) {
        console.error(e);
      }
    }
  }, [notifications, mounted]);

  const addNotification = (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: `${Date.now()}-${Math.random()}`,
      time: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Écouter les événements WebSocket globaux pour alimenter le panneau de notifications
  useEffect(() => {
    const handleWsMessage = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data) return;
      if (data.type === 'snapshot') {
        addNotification({
          type: 'capture',
          title: '📷 Nouvelle capture',
          message: `${data.server_nom || 'Serveur'} — ${data.count ? data.count + ' capture(s) conservée(s)' : 'capture enregistrée'}`,
          color: '#10b981',
        });
      } else if (data.type === 'status') {
        addNotification({
          type: 'status',
          title: data.statut === 'actif' ? '🟢 Serveur en ligne' : '🔴 Serveur hors ligne',
          message: `${data.nom} est maintenant ${data.statut === 'actif' ? 'actif' : 'inactif'}`,
          color: data.statut === 'actif' ? '#10b981' : '#ef4444',
        });
      } else if (data.type === 'critical_alert') {
        addNotification({
          type: 'alert',
          title: '⚠️ Alerte critique',
          message: data.message,
          color: '#ef4444',
        });
      }
    };
    window.addEventListener('sgssa_ws_message', handleWsMessage);
    return () => window.removeEventListener('sgssa_ws_message', handleWsMessage);
  }, []);

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
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Déconnexion réussie');
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    setNotifOpen(false);
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

  const formatTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `il y a ${diff}s`;
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
    return `il y a ${Math.floor(diff / 3600)}h`;
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
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/gov-logo.png" alt="Logo Gouvernement" style={{ width: 42, height: 42, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', letterSpacing: '0.02em' }}>SGSSA</div>
              <div style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.2, fontWeight: 500 }}>DDI — MTNIMA</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredNavItems.filter(i => !i.section).map(renderNavItem)}
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-title">{section}</div>
              {filteredNavItems.filter(i => i.section === section).map(renderNavItem)}
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: 'white', flexShrink: 0 }}>
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nom_complet || user?.email}</div>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'capitalize', color: user?.role === 'admin' ? '#60a5fa' : '#94a3b8' }}>{user?.role}</div>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-icon" title="Déconnexion" style={{ padding: '6px', flexShrink: 0 }}>
              <LogOut size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px 0', fontSize: 11, color: '#64748b' }}>
            <div className={`live-dot ${isOnline ? 'live-dot-green' : 'live-dot-red'}`} style={{ width: 6, height: 6 }} />
            {isOnline ? 'Connecté' : 'Hors ligne'}
          </div>
        </div>
      </aside>

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(v => !v)} style={{ display: 'none' }} id="mobile-menu-btn">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{NAV_ITEMS.find(i => pathname.startsWith(i.href) && i.href !== '/')?.label || 'Tableau de bord'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
              <Wifi size={12} style={{ color: isOnline ? '#10b981' : '#ef4444' }} />
              Système{isOnline ? ' en ligne' : ' hors ligne'}
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

            <div style={{ position: 'relative' }}>
              <button id="notif-bell-btn" onClick={() => { setNotifOpen(v => !v); if (!notifOpen) markAllRead(); }} className="btn btn-ghost btn-icon" title="Notifications" style={{ position: 'relative', padding: '6px' }}>
                <Bell size={17} style={{ color: unreadCount > 0 ? '#f59e0b' : '#64748b', transition: 'color 0.2s', animation: unreadCount > 0 ? 'bell-ring 1s ease-in-out' : 'none' }} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 999, background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg)', animation: 'notif-pop 0.3s ease-out', padding: '0 3px', lineHeight: 1 }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setNotifOpen(false)} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, maxHeight: 460, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'notif-slide-in 0.2s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bell size={14} style={{ color: '#f59e0b' }} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>Notifications</span>
                        {notifications.length > 0 && <span style={{ padding: '1px 7px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>{notifications.length}</span>}
                      </div>
                      {notifications.length > 0 && <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', padding: 0 }}>Tout effacer</button>}
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                          <Bell size={28} style={{ color: '#334155', marginBottom: 8 }} />
                          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Aucune notification</p>
                          <p style={{ color: '#475569', fontSize: 11, margin: '4px 0 0' }}>Les alertes et captures apparaîtront ici</p>
                        </div>
                      ) : (
                        notifications.map((notif, i) => (
                          <div key={notif.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: notif.read ? 'transparent' : 'rgba(59,130,246,0.04)', transition: 'background 0.2s' }} className="notif-item">
                            <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${notif.color}18`, border: `1px solid ${notif.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                              {notif.type === 'capture' ? '📷' : notif.type === 'alert' ? '⚠️' : '🔔'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{notif.title}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, wordBreak: 'break-word' }}>{notif.message}</div>
                              <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{formatTimeAgo(notif.time)}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <button 
                                onClick={(e) => deleteNotification(notif.id, e)} 
                                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 4, transition: 'all 0.2s' }}
                                className="btn-delete-notif"
                                title="Supprimer cette notification"
                              >
                                <X size={11} />
                              </button>
                              {!notif.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                        <Link href="/activities" onClick={() => setNotifOpen(false)} style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Voir toutes les activités →</Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <AlertBanner />

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes notif-pop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes notif-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(15deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(10deg); }
        }
        .btn-delete-notif:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1);
        }
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
