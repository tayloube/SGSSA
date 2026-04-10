'use client';
/**
 * Page Gestion des Logiciels — SGSSA
 */
import { useState, useEffect, useCallback } from 'react';
import { softwareAPI, serversAPI } from '@/lib/api';
import type { Software, Server } from '@/types';
import toast from 'react-hot-toast';
import {
  Plus, Search, Package, Box, 
  Edit2, Trash2, RefreshCw, Server as ServerIcon, Calendar, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SoftwarePage() {
  const [software, setSoftware]   = useState<Software[]>([]);
  const [servers, setServers]     = useState<Server[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSoftware, setEditSoftware] = useState<Software | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await softwareAPI.list(params);
      setSoftware(data.results);
    } catch { 
      toast.error('Erreur chargement des logiciels'); 
    } finally { 
      setLoading(false); 
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    serversAPI.list().then(d => setServers(d.results)).catch(() => {});
  }, []);

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Supprimer le logiciel "${nom}" ?`)) return;
    try {
      await softwareAPI.delete(id);
      toast.success(`Logiciel "${nom}" supprimé`);
      fetchData();
    } catch { toast.error('Erreur suppression'); }
  };

  const openEdit = (sw: Software) => { setEditSoftware(sw); setShowModal(true); };
  const openNew  = () => { setEditSoftware(null); setShowModal(true); };

  return (
    <div className="page-container">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
            Inventaire Logiciel
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {software.length} logiciel(s) — Gestion des licences et versions par serveur
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchData} className="btn btn-ghost btn-sm">
            <RefreshCw size={13} />
          </button>
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} />
            Nouveau logiciel
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
            placeholder="Rechercher (nom, éditeur, serveur...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tableau des Logiciels */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Logiciel</th>
                <th>Type Licence</th>
                <th>Version</th>
                <th>Serveur</th>
                <th>Installation</th>
                <th>Expiration Licence</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Chargement...</td></tr>
              ) : software.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Aucun logiciel trouvé</td></tr>
              ) : (
                software.map(sw => (
                  <tr key={sw.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                         <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                           <Package size={16} />
                         </div>
                         <div>
                           <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{sw.nom}</div>
                           <div style={{ fontSize: 11, color: '#64748b' }}>{sw.editeur || 'Éditeur inconnu'}</div>
                         </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: 11, textTransform: 'capitalize', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                        {sw.type_licence}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>v{sw.version || '—'}</code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
                        <ServerIcon size={12} style={{ color: '#64748b' }} /> {sw.serveur_nom}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      {sw.date_installation ? format(new Date(sw.date_installation), 'dd MMM yyyy', { locale: fr }) : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: sw.is_licence_expired ? '#ef4444' : '#94a3b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} style={{ color: '#64748b' }} />
                        {sw.date_expiration_licence ? format(new Date(sw.date_expiration_licence), 'dd MMM yyyy', { locale: fr }) : 'Perpétuelle'}
                      </div>
                    </td>
                    <td>
                      {sw.is_licence_expired ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 11, fontWeight: 600 }}>
                          <AlertTriangle size={12} /> Expirée
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Valide</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(sw)} className="btn btn-ghost btn-icon btn-sm" title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(sw.id, sw.nom)} className="btn btn-ghost btn-icon btn-sm" title="Supprimer" style={{ color: '#ef4444' }}>
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
        <SoftwareModal
          software={editSoftware}
          servers={servers}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}

function SoftwareModal({ software, servers, onClose, onSaved }: {
  software: Software | null;
  servers: Server[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nom: software?.nom || '',
    version: software?.version || '',
    editeur: software?.editeur || '',
    type_licence: software?.type_licence || 'libre',
    serveur: software?.serveur || '',
    date_installation: software?.date_installation || '',
    date_expiration_licence: software?.date_expiration_licence || '',
    description: software?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.date_installation) delete (payload as any).date_installation;
      if (!payload.date_expiration_licence) delete (payload as any).date_expiration_licence;

      if (software) {
        await softwareAPI.update(software.id, payload as Partial<Software>);
        toast.success('Logiciel modifié');
      } else {
        await softwareAPI.create(payload as Partial<Software>);
        toast.success('Logiciel créé');
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
            <Box size={18} style={{ color: '#60a5fa' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{software ? 'Modifier le logiciel' : 'Nouveau logiciel'}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Nom du logiciel *</label>
              <input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} required placeholder="ex: SQL Server 2022" />
            </div>
            <div className="form-group">
              <label className="form-label">Version</label>
              <input className="form-input" value={form.version} onChange={e => set('version', e.target.value)} placeholder="ex: 16.0" />
            </div>
            <div className="form-group">
              <label className="form-label">Éditeur</label>
              <input className="form-input" value={form.editeur} onChange={e => set('editeur', e.target.value)} placeholder="ex: Microsoft" />
            </div>
            <div className="form-group">
              <label className="form-label">Type de licence</label>
              <select className="form-select" value={form.type_licence} onChange={e => set('type_licence', e.target.value)}>
                <option value="libre">Libre / Open Source</option>
                <option value="commercial">Commercial</option>
                <option value="oem">OEM</option>
                <option value="essai">Version d'essai</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Serveur *</label>
              <select className="form-select" value={form.serveur} onChange={e => set('serveur', e.target.value)} required>
                <option value="">Sélectionner un serveur</option>
                {servers.map(s => <option key={s.id} value={s.id}>{s.nom} ({s.adresse_ip})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date d'installation</label>
              <input type="date" className="form-input" value={form.date_installation} onChange={e => set('date_installation', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiration Licence</label>
              <input type="date" className="form-input" value={form.date_expiration_licence} onChange={e => set('date_expiration_licence', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Note / Description</label>
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
