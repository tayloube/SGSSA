'use client';
/**
 * Page Gestion des Applications Web — SGSSA
 */
import { useState, useEffect, useCallback } from 'react';
import { webappsAPI, serversAPI } from '@/lib/api';
import type { WebApplication, Server } from '@/types';
import toast from 'react-hot-toast';
import {
  Plus, Search, Globe, ExternalLink, 
  Edit2, Trash2, RefreshCw, Server as ServerIcon, Shield, ShieldAlert, Cpu
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUT_WEB_LABELS: Record<string, string> = { 
  en_ligne: 'En ligne', 
  hors_ligne: 'Hors ligne', 
  maintenance: 'En maintenance' 
};

export default function WebAppsPage() {
  const [apps, setApps]         = useState<WebApplication[]>([]);
  const [servers, setServers]   = useState<Server[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editApp, setEditApp]     = useState<WebApplication | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await webappsAPI.list(params);
      setApps(data.results);
    } catch { 
      toast.error('Erreur chargement des applications'); 
    } finally { 
      setLoading(false); 
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    serversAPI.list().then(d => setServers(d.results)).catch(() => {});
  }, []);

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Supprimer l'application "${nom}" ?`)) return;
    try {
      await webappsAPI.delete(id);
      toast.success(`Application "${nom}" supprimée`);
      fetchData();
    } catch { toast.error('Erreur suppression'); }
  };

  const openEdit = (app: WebApplication) => { setEditApp(app); setShowModal(true); };
  const openNew  = () => { setEditApp(null); setShowModal(true); };

  return (
    <div className="page-container">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
            Applications Web
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {apps.length} application(s) — Catalogue et surveillance des services web DDI
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchData} className="btn btn-ghost btn-sm">
            <RefreshCw size={13} />
          </button>
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} />
            Nouvelle application
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Rechercher (nom, URL, techno...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Liste des Applications */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Statut</th>
                <th>Application</th>
                <th>Technologie</th>
                <th>Hébergement</th>
                <th>Certificat SSL</th>
                <th>Déploiement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Chargement...</td></tr>
              ) : apps.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Aucune application trouvée</td></tr>
              ) : (
                apps.map(app => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <div className={`live-dot ${
                           app.statut === 'en_ligne' ? 'live-dot-green' :
                           app.statut === 'hors_ligne' ? 'live-dot-red' : 'live-dot-yellow'
                         }`} />
                         <span className={`badge badge-${app.statut === 'en_ligne' ? 'actif' : app.statut === 'hors_ligne' ? 'inactif' : 'maintenance'}`} style={{ fontSize: 10 }}>
                           {STATUT_WEB_LABELS[app.statut]}
                         </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{app.nom}</div>
                        <a href={app.url} target="_blank" rel="noopener noreferrer" 
                           style={{ fontSize: 11, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          <ExternalLink size={10} /> {app.url}
                        </a>
                      </div>
                    </td>
                    <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                         <Cpu size={12} style={{ color: '#64748b' }} /> {app.technologie || '—'}
                       </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
                        <ServerIcon size={12} style={{ color: '#64748b' }} /> {app.serveur_nom}
                      </div>
                    </td>
                    <td>
                      {app.cert_statut ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: app.cert_statut === 'valide' ? '#10b981' : '#ef4444' }}>
                          {app.cert_statut === 'valide' ? <Shield size={12} /> : <ShieldAlert size={12} />}
                          <span>{app.cert_statut.toUpperCase()}</span>
                          {app.cert_expiration && (
                            <span style={{ color: '#64748b' }}>({format(new Date(app.cert_expiration), 'dd/MM')})</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#475569' }}>Non configuré</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      {app.date_deploiement ? format(new Date(app.date_deploiement), 'dd MMM yyyy', { locale: fr }) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(app)} className="btn btn-ghost btn-icon btn-sm" title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(app.id, app.nom)} className="btn btn-ghost btn-icon btn-sm" title="Supprimer" style={{ color: '#ef4444' }}>
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
        <WebAppModal
          app={editApp}
          servers={servers}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}

function WebAppModal({ app, servers, onClose, onSaved }: {
  app: WebApplication | null;
  servers: Server[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nom: app?.nom || '',
    url: app?.url || '',
    technologie: app?.technologie || '',
    statut: app?.statut || 'en_ligne',
    serveur: app?.serveur || '',
    date_deploiement: app?.date_deploiement || '',
    contact_responsable: app?.contact_responsable || '',
    description: app?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (app) {
        await webappsAPI.update(app.id, form as Partial<WebApplication>);
        toast.success('Application modifiée');
      } else {
        await webappsAPI.create(form as Partial<WebApplication>);
        toast.success('Application créée');
      }
      onSaved();
    } catch { toast.error('Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={18} style={{ color: '#60a5fa' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{app ? 'Modifier l\'application' : 'Nouvelle application'}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Nom de l'application *</label>
              <input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} required placeholder="ex: Portail RH" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">URL *</label>
              <input type="url" className="form-input" value={form.url} onChange={e => set('url', e.target.value)} required placeholder="https://app.ddi.gov.mr" />
            </div>
            <div className="form-group">
              <label className="form-label">Technologie</label>
              <input className="form-input" value={form.technologie} onChange={e => set('technologie', e.target.value)} placeholder="ex: Next.js / Python" />
            </div>
            <div className="form-group">
              <label className="form-label">Serveur Hôte *</label>
              <select className="form-select" value={form.serveur} onChange={e => set('serveur', e.target.value)} required>
                <option value="">Sélectionner un serveur</option>
                {servers.map(s => <option key={s.id} value={s.id}>{s.nom} ({s.adresse_ip})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Statut</label>
              <select className="form-select" value={form.statut} onChange={e => set('statut', e.target.value)}>
                <option value="en_ligne">En ligne</option>
                <option value="hors_ligne">Hors ligne</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date Déploiement</label>
              <input type="date" className="form-input" value={form.date_deploiement} onChange={e => set('date_deploiement', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Contact Responsable (Email)</label>
              <input type="email" className="form-input" value={form.contact_responsable} onChange={e => set('contact_responsable', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
