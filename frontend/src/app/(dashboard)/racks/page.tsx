'use client';
/**
 * Page Gestion des Racks — SGSSA
 */
import { useState, useEffect, useCallback } from 'react';
import { racksAPI } from '@/lib/api';
import type { Rack } from '@/types';
import toast from 'react-hot-toast';
import {
  Plus, Search, Database, MapPin, 
  Edit2, Trash2, RefreshCw, BarChart3, Layout
} from 'lucide-react';

export default function RacksPage() {
  const [racks, setRacks]       = useState<Rack[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editRack, setEditRack]         = useState<Rack | null>(null);

  const fetchRacks = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const data = await racksAPI.list(params);
      setRacks(data.results);
    } catch { 
      toast.error('Erreur chargement des racks'); 
    } finally { 
      setLoading(false); 
    }
  }, [search]);

  useEffect(() => { fetchRacks(); }, [fetchRacks]);

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Supprimer le rack "${nom}" ?\nAttention: cela ne supprimera pas les serveurs mais ils ne seront plus rattachés à ce rack.`)) return;
    try {
      await racksAPI.delete(id);
      toast.success(`Rack "${nom}" supprimé`);
      fetchRacks();
    } catch { toast.error('Erreur suppression'); }
  };

  const openEdit = (rack: Rack) => { setEditRack(rack); setShowModal(true); };
  const openNew  = () => { setEditRack(null); setShowModal(true); };

  return (
    <div className="page-container">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
            Gestion des Racks
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {racks.length} rack(s) — Organisation physique de l'infrastructure
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchRacks} className="btn btn-ghost btn-sm">
            <RefreshCw size={13} />
          </button>
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} />
            Nouveau rack
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
            placeholder="Rechercher (nom, datacenter, localisation...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Liste des Racks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#64748b' }}>Chargement...</div>
        ) : racks.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#64748b' }}>Aucun rack trouvé</div>
        ) : (
          racks.map(rack => (
            <div key={rack.id} className="card rack-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ 
                    width: 40, height: 40, borderRadius: 8, 
                    background: 'rgba(59,130,246,0.1)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#3b82f6'
                  }}>
                    <Database size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{rack.nom}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Layout size={12} /> {rack.datacenter}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(rack)} className="btn btn-ghost btn-icon btn-sm"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(rack.id, rack.nom)} className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
                </div>
              </div>

              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Localisation</div>
                    <div style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} style={{ color: '#64748b' }} /> {rack.localisation || '—'}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Capacité</div>
                    <div style={{ fontSize: 13, color: '#cbd5e1' }}>{rack.total_unites_u} U</div>
                  </div>
                </div>

                <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Utilisation : {rack.serveurs_count} / {rack.total_unites_u} U</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: rack.usage_percent > 90 ? '#ef4444' : '#10b981' }}>
                    {rack.usage_percent.toFixed(0)}%
                  </div>
                </div>
                <div className="metric-bar" style={{ height: 6 }}>
                  <div className="metric-bar-fill" style={{ 
                    width: `${Math.min(100, rack.usage_percent)}%`,
                    background: rack.usage_percent > 90 ? '#ef4444' : rack.usage_percent > 70 ? '#f59e0b' : '#3b82f6'
                  }} />
                </div>
              </div>

              <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                 <BarChart3 size={12} style={{ color: '#64748b' }} />
                 <span style={{ fontSize: 11, color: '#64748b' }}>
                   {rack.serveurs_count} serveur(s) physiquement installés
                 </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Créer/Modifier */}
      {showModal && (
        <RackModal
          rack={editRack}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchRacks(); }}
        />
      )}
    </div>
  );
}

function RackModal({ rack, onClose, onSaved }: {
  rack: Rack | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nom: rack?.nom || '',
    datacenter: rack?.datacenter || '',
    localisation: rack?.localisation || '',
    total_unites_u: rack?.total_unites_u || 42,
    description: rack?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (rack) {
        await racksAPI.update(rack.id, form as Partial<Rack>);
        toast.success('Rack modifié');
      } else {
        await racksAPI.create(form as Partial<Rack>);
        toast.success('Rack créé');
      }
      onSaved();
    } catch { toast.error('Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{rack ? 'Modifier le rack' : 'Nouveau rack'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom du rack *</label>
            <input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Datacenter *</label>
            <input className="form-input" value={form.datacenter} onChange={e => set('datacenter', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Localisation (Allée/Position)</label>
            <input className="form-input" value={form.localisation} onChange={e => set('localisation', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Capacité totale (U)</label>
            <input type="number" className="form-input" value={form.total_unites_u} onChange={e => set('total_unites_u', +e.target.value)} min={1} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
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
