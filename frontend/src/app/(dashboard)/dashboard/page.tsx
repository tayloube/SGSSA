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
  XCircle, Activity, Package, Database, RefreshCw,
  TrendingUp, Cpu, HardDrive, Wifi, Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Suppression du calcul global de WS_URL (cause de crash SSR)
// La détection se fait maintenant dynamiquement dans le useEffect

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyScope, setHistoryScope] = useState<{type: 'global' | 'rack' | 'server', id?: number}>({type: 'global'});
  const [racks, setRacks] = useState<any[]>([]);
  const [serversList, setServersList] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // États additionnels pour la navigation de la galerie de captures
  const [activeSnapshotIndexes, setActiveSnapshotIndexes] = useState<Record<number, number>>({});
  const [hoveredServerId, setHoveredServerId] = useState<number | null>(null);
  const [historyModalServer, setHistoryModalServer] = useState<any | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await dashboardAPI.stats();
      setStats(data);
      if (historyScope.type === 'global') {
        setHistoryData(data.historique_24h);
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erreur stats:', err);
    } finally {
      setLoading(false);
    }
  }, [historyScope]);

  const fetchServersList = useCallback(async () => {
    try {
      const sResp = await fetch('/api/servers/', { headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });
      const sData = await sResp.json();
      setServersList(Array.isArray(sData) ? sData : (sData.results || []));
    } catch (e) {
      console.error('Erreur chargement serveurs:', e);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      let data;
      if (historyScope.type === 'server' && historyScope.id) {
        const resp = await fetch(`/api/servers/${historyScope.id}/history_24h/`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        data = await resp.json();
      } else if (historyScope.type === 'rack' && historyScope.id) {
        const resp = await fetch(`/api/racks/${historyScope.id}/history_24h/`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        data = await resp.json();
      } else {
        const stats = await dashboardAPI.stats();
        data = stats.historique_24h;
      }
      setHistoryData(data);
    } catch (err) {
      console.error('Erreur history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyScope]);

  useEffect(() => {
    if (historyScope.type !== 'global') {
      fetchHistory();
    }
  }, [historyScope, fetchHistory]);

  useEffect(() => {
    // Charger les listes pour le sélecteur
    const loadLists = async () => {
      try {
        const rResp = await fetch('/api/racks/', { headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });
        const rData = await rResp.json();
        setRacks(Array.isArray(rData) ? rData : (rData.results || []));
      } catch (e) {
        console.error('Erreur chargement racks:', e);
      }
      await fetchServersList();
    };
    loadLists();
  }, [fetchServersList]);

  // Connexion WebSocket pour les mises à jour en temps réel
  useEffect(() => {
    const token = document.cookie.split('; ').find(r => r.startsWith('access_token='))?.split('=')[1];
    if (!token) return;

    // Détection dynamique de l'URL WS (Client-side only)
    const getWSURL = () => {
      const port = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.hostname}${port}`;
    };

    const WS_URL = getWSURL();
    const ws = new WebSocket(`${WS_URL}/ws/dashboard/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => { setWsConnected(true); fetchStats(); };
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastUpdate(new Date());

      if (data.type === 'metric') {
        // ... existence metrics update ...
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
        // Mise à jour des compteurs
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
        // Diffuser à tous les composants (notifications layout)
        window.dispatchEvent(new CustomEvent('sgssa_ws_message', { detail: data }));
        toast(
          `Alerte: Serveur "${data.nom}" est ${data.statut === 'actif' ? 'en ligne' : 'hors ligne'}`,
          { icon: data.statut === 'actif' ? '🟢' : '🔴', duration: 5000 }
        );
      } else if (data.type === 'critical_alert') {
        // Diffuser à tous les composants (notifications layout)
        window.dispatchEvent(new CustomEvent('sgssa_ws_message', { detail: data }));
        toast.error(data.message, { duration: 10000 });
      } else if (data.type === 'snapshot') {
        // Diffuser à tous les composants (notifications layout)
        window.dispatchEvent(new CustomEvent('sgssa_ws_message', { detail: data }));
        // Recharger la liste des serveurs pour voir le nouveau snapshot dans la galerie
        fetchStats();
        fetchServersList();
      }
    };

    fetchStats();
    return () => ws.close();
  }, [fetchStats, fetchServersList]);

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

      {/* Cartes statistiques + Dernière activité — même grille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Link href="/servers" style={{ textDecoration: 'none' }}>
          <StatCard
            icon={<Server size={22} />}
            color="#3b82f6"
            label="Serveurs"
            value={stats.serveurs.total}
            sub={`${stats.serveurs.actifs} actifs · ${stats.serveurs.inactifs} inactifs`}
            clickable
          />
        </Link>
        <Link href="/racks" style={{ textDecoration: 'none' }}>
          <StatCard
            icon={<Database size={22} />}
            color="#6366f1"
            label="Racks"
            value={stats.racks.total}
            sub="Infrastructures physiques"
            clickable
          />
        </Link>
        <Link href="/webapps" style={{ textDecoration: 'none' }}>
          <StatCard
            icon={<Globe size={22} />}
            color="#10b981"
            label="Applications Web"
            value={stats.applications.total}
            sub={`${stats.applications.en_ligne} en ligne`}
            clickable
          />
        </Link>
        <Link href="/software" style={{ textDecoration: 'none' }}>
          <StatCard
            icon={<Package size={22} />}
            color="#06b6d4"
            label="Logiciels"
            value={stats.logiciels.total}
            sub="Inventaire logiciels"
            clickable
          />
        </Link>
        <Link href="/certificates" style={{ textDecoration: 'none' }}>
          <StatCard
            icon={<Shield size={22} />}
            color={stats.certificats.critiques > 0 ? '#ef4444' : '#10b981'}
            label="Certificats SSL"
            value={stats.certificats.total}
            sub={stats.certificats.critiques > 0
              ? `⚠ ${stats.certificats.critiques} critique(s)`
              : `${stats.certificats.valides} valides`}
            clickable
          />
        </Link>
        <StatCard
          icon={<Cpu size={22} />}
          color="#f59e0b"
          label="CPU moyen"
          value={`${stats.serveurs.metriques_moy.cpu}%`}
          sub={`RAM: ${stats.serveurs.metriques_moy.ram}% · Disk: ${stats.serveurs.metriques_moy.disk}%`}
        />
        {/* Dernière activité — même ligne, large */}
        <Link href="/activities" style={{ textDecoration: 'none', gridColumn: 'span 4', minWidth: 0 }}>
          <div className="stat-card stat-card-clickable" style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center',
            gap: 20,
            padding: '16px 20px',
            height: '100%',
            boxSizing: 'border-box',
          }}>
            <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', width: 44, height: 44, flexShrink: 0 }}>
              <Activity size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>
                Dernière activité
              </div>
              {stats.evenements_recents.length === 0 ? (
                <div style={{ fontSize: 12, color: '#475569' }}>Aucune activité enregistrée</div>
              ) : (
                stats.evenements_recents.slice(0, 3).map((e: any, i: number) => {
                  const catColors: Record<string, string> = {
                    SERVER: '#3b82f6', SSL: '#10b981', SOFTWARE: '#06b6d4', LOGIN: '#8b5cf6', OTHER: '#64748b'
                  };
                  const catColor = catColors[e.category || 'OTHER'] || '#64748b';
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: i === 0 ? 1 : i === 1 ? 0.6 : 0.35 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        <strong style={{ color: '#94a3b8', fontWeight: 600 }}>{e.utilisateur || 'Système'}</strong>
                        {' — '}{e.details || e.action}
                      </span>
                      <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>
                        {formatDistanceToNow(new Date(e.horodatage), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#f97316', fontWeight: 600, flexShrink: 0, opacity: 0.8 }}>
              Voir tout <span style={{ fontSize: 14 }}>→</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Graphique d'historique 24h Isolé */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TrendingUp size={20} style={{ color: '#3b82f6' }} />
            <div>
              <span style={{ fontWeight: 700, fontSize: 15, display: 'block' }}>Historique des ressources (24h)</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>Analyse isolée par serveur ou par rack</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select 
              className="btn btn-ghost btn-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
              value={`${historyScope.type}-${historyScope.id || ''}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split('-');
                setHistoryScope({ type: type as any, id: id ? parseInt(id) : undefined });
              }}
            >
              <option value="global-">Toute l'infrastructure</option>
              <optgroup label="Par Rack">
                {racks.map(r => <option key={`r-${r.id}`} value={`rack-${r.id}`}>{r.nom}</option>)}
              </optgroup>
              <optgroup label="Par Serveur">
                {serversList.map(s => <option key={`s-${s.id}`} value={`server-${s.id}`}>{s.nom}</option>)}
              </optgroup>
            </select>
          </div>
        </div>
        
        <div style={{ padding: '24px 0', opacity: historyLoading ? 0.5 : 1, transition: 'opacity 0.2s', position: 'relative' }}>
          {historyLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <RefreshCw className="animate-spin" size={24} style={{ color: '#3b82f6' }} />
            </div>
          )}
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                itemStyle={{ fontSize: 12 }}
              />
              <Area type="monotone" dataKey="cpu" name="CPU" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
              <Area type="monotone" dataKey="ram" name="RAM" stroke="#6366f1" fillOpacity={1} fill="url(#colorRam)" strokeWidth={2} />
              <Area type="monotone" dataKey="disk" name="Disque" stroke="#10b981" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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



      {/* ═══ Galerie de Surveillance ═══ */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={16} style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Galerie de Surveillance</span>
            {stats.galerie && stats.galerie.length > 0 && (
              <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 999 }}>
                {stats.galerie.length} serveur{stats.galerie.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Link href="/servers" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
            Gérer les serveurs
          </Link>
        </div>

        {!stats.galerie || stats.galerie.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
            <Wifi size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>Aucune capture disponible</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>L'agent enverra sa première photo dans quelques minutes</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, padding: '12px 0' }}>
            {stats.galerie.map((srv) => (
              <ServerGalleryCard
                key={srv.server_id}
                srv={srv}
                onOpenLightbox={(srv, idx) => setHistoryModalServer({ ...srv, initialIndex: idx })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ Lightbox plein écran ═══ */}
      {historyModalServer && (
        <GalleryLightbox
          srv={historyModalServer}
          onClose={() => setHistoryModalServer(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composants internes
// ─────────────────────────────────────────────────────────────
function StatCard({ icon, color, label, value, sub, clickable }: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number | string;
  sub?: string;
  clickable?: boolean;
}) {
  return (
    <div className={`stat-card ${clickable ? 'stat-card-clickable' : ''}`}>
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
      {clickable && (
        <style jsx>{`
          .stat-card-clickable:hover {
            border-color: ${color}40;
            background: rgba(255,255,255,0.03);
            transform: translateY(-2px);
          }
        `}</style>
      )}
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

// ─────────────────────────────────────────────────────────────
// Galerie par Serveur — Carrousel
// ─────────────────────────────────────────────────────────────
function ServerGalleryCard({
  srv,
  onOpenLightbox,
}: {
  srv: { server_id: number; server_nom: string; server_statut: string; server_ip: string; captures: { id: number; image: string; timestamp: string }[] };
  onOpenLightbox: (srv: any, index: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const captures = srv.captures;
  const total = captures.length;
  if (total === 0) return null;

  const snap = captures[current];
  const isOnline = srv.server_statut === 'actif';

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <div style={{
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(15,23,42,0.6)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'; }}
    >
      {/* Image principale avec navigation */}
      <div
        style={{ position: 'relative', height: 180, cursor: 'pointer', overflow: 'hidden', background: '#0f172a' }}
        onClick={() => onOpenLightbox(srv, current)}
      >
        <img
          src={snap.image}
          alt={`${srv.server_nom} capture ${current + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.25s' }}
        />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />

        {/* Badges top */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 999,
            background: isOnline ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
            fontSize: 10, fontWeight: 700, color: 'white',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'white', opacity: isOnline ? 1 : 0.7 }} />
            {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
          </div>
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10, color: '#94a3b8' }}>
          {current + 1} / {total}
        </div>

        {/* Boutons navigation (prev/next) — visibles au hover */}
        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,23,42,0.85)'; }}
            >‹</button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,23,42,0.85)'; }}
            >›</button>
          </>
        )}

        {/* Icône plein écran */}
        <div style={{ position: 'absolute', bottom: 10, right: 10, width: 28, height: 28, borderRadius: 6, background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>⛶</div>
      </div>

      {/* Infos serveur */}
      <div style={{ padding: '12px 14px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{srv.server_nom}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{srv.server_ip}</div>
          </div>
          <div style={{ fontSize: 10, color: '#475569', textAlign: 'right', lineHeight: 1.5 }}>
            <div style={{ color: '#94a3b8' }}>{new Date(snap.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            <div>{formatDistanceToNow(new Date(snap.timestamp), { addSuffix: true, locale: fr })}</div>
          </div>
        </div>
      </div>

      {/* Miniatures (strip) */}
      {total > 1 && (
        <div style={{ display: 'flex', gap: 4, padding: '0 14px 12px', overflowX: 'auto' }}>
          {captures.slice(0, 12).map((cap, i) => (
            <button
              key={cap.id}
              onClick={() => setCurrent(i)}
              style={{
                flexShrink: 0,
                width: 36, height: 26,
                borderRadius: 4,
                border: i === current ? '2px solid #3b82f6' : '2px solid transparent',
                overflow: 'hidden', cursor: 'pointer', padding: 0,
                opacity: i === current ? 1 : 0.5,
                transition: 'opacity 0.15s, border-color 0.15s',
              }}
            >
              <img src={cap.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Lightbox plein écran
// ─────────────────────────────────────────────────────────────
function GalleryLightbox({
  srv,
  onClose,
}: {
  srv: { server_id: number; server_nom: string; server_statut: string; server_ip: string; captures: { id: number; image: string; timestamp: string }[]; initialIndex?: number };
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(srv.initialIndex ?? 0);
  const captures = srv.captures;
  const total = captures.length;
  const snap = captures[current];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrent((c) => (c - 1 + total) % total);
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % total);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [total, onClose]);

  if (!snap) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }} onClick={e => e.stopPropagation()}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            {srv.server_nom}
            <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: srv.server_statut === 'actif' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', color: srv.server_statut === 'actif' ? '#34d399' : '#f87171' }}>
              {srv.server_statut === 'actif' ? '● EN LIGNE' : '● HORS LIGNE'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Capture {current + 1}/{total} · {new Date(snap.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#f1f5f9', width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>

      {/* Image principale */}
      <div style={{ position: 'relative', maxWidth: '80vw', maxHeight: '70vh', display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
        {total > 1 && (
          <button onClick={() => setCurrent((c) => (c - 1 + total) % total)} style={{ position: 'absolute', left: -56, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#f1f5f9', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        )}
        <img
          src={snap.image}
          alt={`${srv.server_nom} #${current + 1}`}
          style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', display: 'block' }}
        />
        {total > 1 && (
          <button onClick={() => setCurrent((c) => (c + 1) % total)} style={{ position: 'absolute', right: -56, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#f1f5f9', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        )}
      </div>

      {/* Strip miniatures en bas */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', justifyContent: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
        {captures.map((cap, i) => (
          <button
            key={cap.id}
            onClick={() => setCurrent(i)}
            style={{
              flexShrink: 0, width: 52, height: 36, borderRadius: 6, overflow: 'hidden',
              border: i === current ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', padding: 0,
              opacity: i === current ? 1 : 0.45,
              transition: 'opacity 0.15s, border-color 0.15s',
              boxShadow: i === current ? '0 0 0 2px rgba(59,130,246,0.4)' : 'none',
            }}
          >
            <img src={cap.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

