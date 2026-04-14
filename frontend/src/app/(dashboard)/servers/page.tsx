'use client';
/**
 * Page Gestion des Serveurs — SGSSA
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { serversAPI, racksAPI } from '@/lib/api';
import type { Server, Rack } from '@/types';
import toast from 'react-hot-toast';
import {
  Plus, Search, Filter, Server as ServerIcon, Cpu, HardDrive,
  Edit2, Trash2, Eye, Activity, RefreshCw, Wifi, WifiOff, Settings
} from 'lucide-react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

const TYPE_LABELS: Record<string, string> = { physique: 'Physique', virtuel: 'Virtuel', cloud: 'Cloud' };
const STATUT_LABELS: Record<string, string> = { actif: 'Actif', inactif: 'Inactif', maintenance: 'Maintenance' };

export default function ServersPage() {
  const [servers, setServers]   = useState<Server[]>([]);
  const [racks, setRacks]       = useState<Rack[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editServer, setEditServer]     = useState<Server | null>(null);
  const [detailServer, setDetailServer] = useState<Server | null>(null);
  const [liveMetrics, setLiveMetrics]   = useState<Record<number, { cpu: number; ram: number; disk: number; temp?: number; snapshot?: string }>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStatut) params.statut = filterStatut;
      if (filterType)   params.type = filterType;
      if (search)       params.search = search;
      const data = await serversAPI.list(params);
      setServers(data.results);
    } catch { toast.error('Erreur chargement serveurs'); }
    finally { setLoading(false); }
  }, [search, filterStatut, filterType]);

  useEffect(() => { fetchServers(); }, [fetchServers]);
  useEffect(() => {
    racksAPI.list().then(d => setRacks(d.results)).catch(() => {});
  }, []);

  // Connexion WebSocket
  useEffect(() => {
    const token = document.cookie.split('; ').find(r => r.startsWith('access_token='))?.split('=')[1];
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/dashboard/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'metric') {
        setLiveMetrics(prev => ({
          ...prev,
          [data.server_id]: {
            cpu: data.cpu,
            ram: data.ram,
            disk: data.disk,
            temp: data.temp,
          }
        }));
      } else if (data.type === 'status') {
        // Mise à jour du statut dans la liste des serveurs
        setServers(prev => prev.map(s => 
          s.id === data.server_id ? { ...s, statut: data.statut } : s
        ));
        toast(
          `Serveur "${data.nom}" est maintenant ${data.statut === 'actif' ? 'en ligne' : 'hors ligne'}`,
          { icon: data.statut === 'actif' ? '🟢' : '🔴', duration: 4000 }
        );
      } else if (data.type === 'snapshot') {
        setLiveMetrics(prev => ({
          ...prev,
          [data.server_id]: {
            ...(prev[data.server_id] || { cpu: 0, ram: 0, disk: 0 }),
            snapshot: data.image_url
          }
        }));
      }
    };

    return () => ws.close();
  }, []);

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Supprimer le serveur "${nom}" ?`)) return;
    try {
      await serversAPI.delete(id);
      toast.success(`Serveur "${nom}" supprimé`);
      fetchServers();
    } catch { toast.error('Erreur suppression'); }
  };

  const openEdit = (server: Server) => { setEditServer(server); setShowModal(true); };
  const openNew  = () => { setEditServer(null); setShowModal(true); };

  return (
    <div className="page-container">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
            Gestion des Serveurs
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {servers.length} serveur(s) — Surveillance et administration des serveurs DDI
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchServers} className="btn btn-ghost btn-sm">
            <RefreshCw size={13} />
          </button>
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} />
            Nouveau serveur
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Rechercher (nom, IP, OS...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          <option value="physique">Physique</option>
          <option value="virtuel">Virtuel</option>
          <option value="cloud">Cloud</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Statut</th>
                <th>Serveur</th>
                <th>IP</th>
                <th>Type</th>
                <th>OS</th>
                <th>CPU</th>
                <th>RAM</th>
                <th>Rack</th>
                <th>Métriques</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Chargement...</td></tr>
              ) : servers.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Aucun serveur trouvé</td></tr>
              ) : (
                servers.map(server => (
                  <tr key={server.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className={`live-dot ${
                          server.statut === 'actif' ? 'live-dot-green' :
                          server.statut === 'inactif' ? 'live-dot-red' : 'live-dot-yellow'
                        }`} />
                        <span className={`badge badge-${server.statut}`} style={{ fontSize: 11 }}>
                          {STATUT_LABELS[server.statut]}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{server.nom}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {server.apps_count} app(s) · {server.logiciels_count} logiciel(s)
                      </div>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#60a5fa',
                        background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                        {server.adresse_ip}
                      </code>
                    </td>
                    <td><span className="badge" style={{ fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>{TYPE_LABELS[server.type]}</span></td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>{server.systeme_exploitation}</td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Cpu size={13} style={{ color: '#64748b' }} />
                        {server.cpu_coeurs} cœurs
                      </div>
                      {server.derniere_metrique && (
                        <MetricMini value={server.derniere_metrique.cpu_usage} color="#3b82f6" />
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      {server.ram_go} Go
                      {server.derniere_metrique && (
                        <MetricMini value={server.derniere_metrique.ram_usage} color="#6366f1" />
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{server.rack_nom || '—'}</td>
                    <td>
                      {liveMetrics[server.id] || server.derniere_metrique ? (
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          CPU: <span style={{ color: '#f1f5f9' }}>{(liveMetrics[server.id]?.cpu ?? server.derniere_metrique?.cpu_usage ?? 0).toFixed(0)}%</span>
                          {' '}RAM: <span style={{ color: '#f1f5f9' }}>{(liveMetrics[server.id]?.ram ?? server.derniere_metrique?.ram_usage ?? 0).toFixed(0)}%</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#475569' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setDetailServer(server)} className="btn btn-ghost btn-icon btn-sm" title="Détails">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => openEdit(server)} className="btn btn-ghost btn-icon btn-sm" title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(server.id, server.nom)} className="btn btn-ghost btn-icon btn-sm" title="Supprimer" style={{ color: '#ef4444' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Créer/Modifier */}
      {showModal && (
        <ServerModal
          server={editServer}
          racks={racks}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchServers(); }}
        />
      )}

      {/* Modal Détail */}
      {detailServer && (
        <ServerDetailModal
          server={detailServer}
          liveData={liveMetrics[detailServer.id]}
          onClose={() => setDetailServer(null)}
        />
      )}
    </div>
  );
}

function MetricMini({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div className="metric-bar" style={{ height: 4 }}>
        <div className="metric-bar-fill" style={{
          width: `${Math.min(100, value)}%`,
          background: value > 90 ? '#ef4444' : value > 70 ? '#f59e0b' : color
        }} />
      </div>
    </div>
  );
}

function ServerModal({ server, racks, onClose, onSaved }: {
  server: Server | null;
  racks: Rack[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nom: server?.nom || '',
    adresse_ip: server?.adresse_ip || '',
    systeme_exploitation: server?.systeme_exploitation || '',
    type: server?.type || 'physique',
    statut: server?.statut || 'actif',
    cpu_coeurs: server?.cpu_coeurs || 4,
    ram_go: server?.ram_go || 16,
    stockage_go: server?.stockage_go || 500,
    rack: server?.rack || '',
    description: server?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (server) {
        await serversAPI.update(server.id, form as Partial<Server>);
        toast.success('Serveur modifié');
      } else {
        await serversAPI.create(form as Partial<Server>);
        toast.success('Serveur créé');
      }
      onSaved();
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const msg = errData ? Object.values(errData).flat().join(' ') : 'Erreur lors de la sauvegarde';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ServerIcon size={18} style={{ color: '#60a5fa' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{server ? 'Modifier le serveur' : 'Nouveau serveur'}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><span style={{ fontSize: 18 }}>×</span></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Nom du serveur *</label>
              <input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} required placeholder="SRV-WEB-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Adresse IP *</label>
              <input className="form-input" value={form.adresse_ip} onChange={e => set('adresse_ip', e.target.value)} required placeholder="192.168.1.100" />
            </div>
            <div className="form-group">
              <label className="form-label">Système d'exploitation</label>
              <input className="form-input" value={form.systeme_exploitation} onChange={e => set('systeme_exploitation', e.target.value)} placeholder="Ubuntu 22.04 LTS" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="physique">Physique</option>
                <option value="virtuel">Virtuel</option>
                <option value="cloud">Cloud</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Statut</label>
              <select className="form-select" value={form.statut} onChange={e => set('statut', e.target.value)}>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cœurs CPU</label>
              <input type="number" className="form-input" value={form.cpu_coeurs} onChange={e => set('cpu_coeurs', +e.target.value)} min={1} />
            </div>
            <div className="form-group">
              <label className="form-label">RAM (Go)</label>
              <input type="number" className="form-input" value={form.ram_go} onChange={e => set('ram_go', +e.target.value)} min={1} />
            </div>
            <div className="form-group">
              <label className="form-label">Stockage (Go)</label>
              <input type="number" className="form-input" value={form.stockage_go} onChange={e => set('stockage_go', +e.target.value)} min={1} />
            </div>
            <div className="form-group">
              <label className="form-label">Rack</label>
              <select className="form-select" value={form.rack} onChange={e => set('rack', e.target.value)}>
                <option value="">Aucun rack</option>
                {racks.map(r => <option key={r.id} value={r.id}>{r.nom} — {r.datacenter}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Sauvegarde...' : server ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ServerDetailModal({ server, liveData, onClose }: { 
  server: Server; 
  liveData?: { cpu: number; ram: number; disk: number; temp?: number; snapshot?: string };
  onClose: () => void 
}) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  
  // Fusionner les données statiques (DB) et live (WebSocket)
  const currentCPU = liveData?.cpu ?? server.derniere_metrique?.cpu_usage ?? 0;
  const currentRAM = liveData?.ram ?? server.derniere_metrique?.ram_usage ?? 0;
  const currentDisk = liveData?.disk ?? server.derniere_metrique?.disk_usage ?? 0;
  const currentTemp = liveData?.temp ?? server.derniere_metrique?.cpu_temp ?? 0;
  const currentSnapshot = liveData?.snapshot || (server.dernier_snapshot?.image);
  const snapshotTime = liveData?.snapshot ? new Date().toISOString() : server.dernier_snapshot?.timestamp;
  
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`live-dot ${server.statut === 'actif' ? 'live-dot-green' : 'live-dot-red'}`} />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{server.nom}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><span style={{ fontSize: 18 }}>×</span></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
          {/* Colonne Gauche: Infos & Métriques */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Adresse IP', value: server.adresse_ip },
                { label: 'Système', value: server.systeme_exploitation },
                { label: 'Hardware', value: `${server.cpu_coeurs} cœurs / ${server.ram_go} Go` },
                { label: 'Rack', value: server.rack_nom || '—' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: '#f1f5f9' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} /> Métriques Temps Réel
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <MetricDisplay label="Utilisation CPU" value={currentCPU} color="#3b82f6" />
              <MetricDisplay label="RAM occupée" value={currentRAM} color="#6366f1" />
              <MetricDisplay label="Disque utilisé" value={currentDisk} color="#10b981" />
              <MetricDisplay label="Température CPU" value={currentTemp} color="#f59e0b" suffix="°C" max={100} />
            </div>
            
            {server.description && (
              <div style={{ marginTop: 24, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>DESCRIPTION</div>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>{server.description}</p>
              </div>
            )}
          </div>

          {/* Colonne Droite: Surveillance Caméra */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={14} /> Surveillance Caméra
            </h3>
            {currentSnapshot ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a' }}>
                <img 
                  key={currentSnapshot} // Force re-render on new image
                  src={currentSnapshot.startsWith('http') ? currentSnapshot : `${API_URL}${currentSnapshot}`} 
                  alt="Snapshot" 
                  style={{ width: '100%', display: 'block' }} 
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: 'white', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Live Feed</span>
                  <span>{snapshotTime ? new Date(snapshotTime).toLocaleTimeString() : '--:--'}</span>
                </div>
              </div>
            ) : (
              <div style={{ 
                height: 180, borderRadius: 12, border: '2px dashed rgba(255,255,255,0.05)', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                color: '#475569'
              }}>
                <WifiOff size={24} />
                <span style={{ fontSize: 12 }}>Aucun flux vidéo</span>
              </div>
            )}
            <p style={{ marginTop: 12, fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
              L'agent distant prend une capture d'écran toutes les 5 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricDisplay({ label, value, color, suffix = '%', max = 100 }: { label: string; value: number; color: string; suffix?: string; max?: number }) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: value > 80 ? '#ef4444' : '#f1f5f9' }}>{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="metric-bar" style={{ height: 6 }}>
        <div className="metric-bar-fill" style={{ width: `${percent}%`, background: value > 80 ? '#ef4444' : color }} />
      </div>
    </div>
  );
}
