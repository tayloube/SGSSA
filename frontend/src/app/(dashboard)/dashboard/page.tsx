'use client';
/**
 * Tableau de bord principal — SGSSA
 * Statistiques temps réel via WebSocket
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { DashboardStats } from '@/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Server, Globe, Shield, AlertTriangle, CheckCircle2,
  XCircle, Clock, Activity, Package, Database, RefreshCw,
  TrendingUp, Cpu, HardDrive, Wifi
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const getWSURL = () => {
  if (typeof window === 'undefined') return '';
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.hostname}${port}`;
};

const WS_URL = getWSURL();

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await dashboardAPI.stats();
      setStats(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erreur stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Connexion WebSocket pour les mises à jour en temps réel
  useEffect(() => {
    const token = document.cookie.split('; ').find(r => r.startsWith('access_token='))?.split('=')[1];
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/dashboard/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => { setWsConnected(true); fetchStats(); };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastUpdate(new Date());

      if (data.type === 'metric') {
        // Mise à jour des métriques moyennes en temps réel
        setStats(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            serveurs: {
              ...prev.serveurs,
              metriques_moy: {
                cpu: data.cpu,
                ram: data.ram,
                disk: data.disk,
              }
            }
          };
        });
      } else if (data.type === 'status') {
        // Mise à jour des compteurs globaux en temps réel
        setStats(prev => {
          if (!prev) return prev;
          const isActif = data.statut === 'actif';
          return {
            ...prev,
            serveurs: {
              ...prev.serveurs,
              actifs: isActif ? prev.serveurs.actifs + 1 : prev.serveurs.actifs - 1,
              inactifs: isActif ? prev.serveurs.inactifs - 1 : prev.serveurs.inactifs + 1,
            }
          };
        });
        toast(
          `Alerte: Serveur "${data.nom}" est ${data.statut === 'actif' ? 'en ligne' : 'hors ligne'}`,
          { icon: data.statut === 'actif' ? '🟢' : '🔴', duration: 5000 }
        );
      } else if (data.type === 'stats') {
        setStats(prev => prev ? {
          ...prev,
          serveurs: { ...prev.serveurs, actifs: data.serveurs_actifs },
        } : prev);
      }
    };

    fetchStats();
    return () => ws.close();
  }, [fetchStats]);

  if (loading) return (
    <div className="page-container">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="stat-card" style={{ opacity: 0.5 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: '#334155', animation: 'pulse 2s infinite' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, background: '#334155', borderRadius: 4, width: '60%', marginBottom: 8, animation: 'pulse 2s infinite' }} />
              <div style={{ height: 24, background: '#334155', borderRadius: 4, width: '40%', animation: 'pulse 2s infinite' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!stats) return null;

  const serverData = [
    { name: 'Actifs', value: stats.serveurs.actifs, color: '#10b981' },
    { name: 'Inactifs', value: stats.serveurs.inactifs, color: '#ef4444' },
    { name: 'Maintenance', value: stats.serveurs.maintenance, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const certData = [
    { name: 'Valides',    value: stats.certificats.valides,   color: '#10b981' },
    { name: 'Attention',  value: stats.certificats.attention, color: '#f59e0b' },
    { name: 'Critiques',  value: stats.certificats.critiques, color: '#ef4444' },
    { name: 'Expirés',    value: stats.certificats.expires,   color: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <div className="page-container">
      {/* En-tête */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
            Tableau de bord
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Bonjour, <span style={{ color: '#94a3b8' }}>{user?.prenom}</span> — Vue d'ensemble de l'infrastructure DDI
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {wsConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 12, color: '#34d399' }}>
              <div className="live-dot live-dot-green" style={{ width: 6, height: 6 }} />
              Temps réel
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#fbbf24' }}>
              <div className="live-dot live-dot-yellow" style={{ width: 6, height: 6 }} />
              Différé
            </div>
          )}
          <button onClick={fetchStats} className="btn btn-ghost btn-sm">
            <RefreshCw size={13} />
            Actualiser
          </button>
          <span style={{ fontSize: 11, color: '#475569' }}>
            Mis à jour {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: fr })}
          </span>
        </div>
      </div>

      {/* Alertes critiques */}
      {stats.alertes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
              Alertes actives ({stats.alertes.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.alertes.slice(0, 3).map((alerte, i) => (
              <div key={i} className={`alert-banner alert-${alerte.niveau === 'critical' || alerte.niveau === 'expired' ? 'critical' : 'warning'}`}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{alerte.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cartes statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={<Server size={22} />}
          color="#3b82f6"
          label="Serveurs"
          value={stats.serveurs.total}
          sub={`${stats.serveurs.actifs} actifs · ${stats.serveurs.inactifs} inactifs`}
        />
        <StatCard
          icon={<Database size={22} />}
          color="#6366f1"
          label="Racks"
          value={stats.racks.total}
          sub="Infrastructures physiques"
        />
        <StatCard
          icon={<Globe size={22} />}
          color="#10b981"
          label="Applications Web"
          value={stats.applications.total}
          sub={`${stats.applications.en_ligne} en ligne`}
        />
        <StatCard
          icon={<Package size={22} />}
          color="#06b6d4"
          label="Logiciels"
          value={stats.logiciels.total}
          sub="Inventaire logiciels"
        />
        <StatCard
          icon={<Shield size={22} />}
          color={stats.certificats.critiques > 0 ? '#ef4444' : '#10b981'}
          label="Certificats SSL"
          value={stats.certificats.total}
          sub={stats.certificats.critiques > 0
            ? `⚠ ${stats.certificats.critiques} critique(s)`
            : `${stats.certificats.valides} valides`}
        />
        <StatCard
          icon={<Cpu size={22} />}
          color="#f59e0b"
          label="CPU moyen"
          value={`${stats.serveurs.metriques_moy.cpu}%`}
          sub={`RAM: ${stats.serveurs.metriques_moy.ram}% · Disk: ${stats.serveurs.metriques_moy.disk}%`}
        />
      </div>

      {/* Graphiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Donut Serveurs */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 14 }}>Répartition des serveurs</span>
            <Server size={16} style={{ color: '#64748b' }} />
          </div>
          {serverData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={serverData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {serverData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]}
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>
              Aucune donnée
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {serverData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                {d.name}: <strong style={{ color: '#f1f5f9' }}>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Certificats */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 14 }}>État des certificats SSL</span>
            <Shield size={16} style={{ color: '#64748b' }} />
          </div>
          {certData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={certData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {certData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>
              Aucun certificat
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {certData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                {d.name}: <strong style={{ color: '#f1f5f9' }}>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Métriques moyennes */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 14 }}>Métriques infrastructure</span>
            <Activity size={16} style={{ color: '#64748b' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>
            <MetricBar label="CPU" value={stats.serveurs.metriques_moy.cpu} color="#3b82f6" icon={<Cpu size={14} />} />
            <MetricBar label="RAM" value={stats.serveurs.metriques_moy.ram} color="#6366f1" icon={<Activity size={14} />} />
            <MetricBar label="Disque" value={stats.serveurs.metriques_moy.disk} color="#10b981" icon={<HardDrive size={14} />} />
          </div>
        </div>
      </div>

      {/* Événements récents */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Activité récente</span>
          <Clock size={16} style={{ color: '#64748b' }} />
        </div>
        {stats.evenements_recents.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Aucune activité récente
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {stats.evenements_recents.map((e, i) => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 0',
                borderBottom: i < stats.evenements_recents.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(59,130,246,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Activity size={13} style={{ color: '#60a5fa' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 2 }}>
                    <strong style={{ color: '#94a3b8' }}>{e.utilisateur}</strong>
                    {' — '}{e.details || e.action}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    {formatDistanceToNow(new Date(e.horodatage), { addSuffix: true, locale: fr })}
                  </div>
                </div>
                <div style={{
                  padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(255,255,255,0.05)',
                  fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono, monospace',
                  flexShrink: 0
                }}>
                  {e.action}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composants internes
// ─────────────────────────────────────────────────────────────
function StatCard({ icon, color, label, value, sub }: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function MetricBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const safeVal = Math.min(100, Math.max(0, value || 0));
  const textColor = safeVal > 90 ? '#ef4444' : safeVal > 70 ? '#f59e0b' : color;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
          <span style={{ color }}>{icon}</span>
          {label}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: textColor }}>{safeVal.toFixed(1)}%</span>
      </div>
      <div className="metric-bar">
        <div className="metric-bar-fill" style={{ width: `${safeVal}%`, background: textColor }} />
      </div>
    </div>
  );
}
