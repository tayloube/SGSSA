'use client';
/**
 * Page Gestion des Certificats SSL — SGSSA
 */
import { useState, useEffect, useCallback } from 'react';
import { certificatesAPI, webappsAPI } from '@/lib/api';
import type { SSLCertificate, WebApplication } from '@/types';
import toast from 'react-hot-toast';
import { Shield, Plus, Search, AlertTriangle, CheckCircle, XCircle, Clock, Edit2, Trash2, RefreshCw, Lock, Unlock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ALERT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ok:       { label: 'Valide',    color: '#10b981', icon: <CheckCircle size={13} /> },
  warning:  { label: 'Attention', color: '#f59e0b', icon: <Clock size={13} /> },
  critical: { label: 'Critique',  color: '#ef4444', icon: <AlertTriangle size={13} /> },
  expired:  { label: 'Expiré',   color: '#6b7280', icon: <XCircle size={13} /> },
};

export default function CertificatesPage() {
  const [certs, setCerts]   = useState<SSLCertificate[]>([]);
  const [apps, setApps]     = useState<WebApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCert, setEditCert] = useState<SSLCertificate | null>(null);

  const fetchCerts = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatut) params.statut = filterStatut;
      if (search) params.search = search;
      const data = await certificatesAPI.list(params);
      
      const mapped = (data.results || []).map((c: any) => {
        const days = c.jours_restants !== undefined ? c.jours_restants : 0;
        const isExpired = days < 0;
        
        let alertLevel: 'ok' | 'warning' | 'critical' | 'expired' = 'ok';
        if (isExpired) {
          alertLevel = 'expired';
        } else if (days <= 7) {
          alertLevel = 'critical';
        } else if (days <= 30) {
          alertLevel = 'warning';
        }

        return {
          ...c,
          days_until_expiry: days,
          is_expired: isExpired,
          alert_level: alertLevel,
          application_nom: c.webapp_nom || null,
          application: c.webapp || null,
        };
      });
      setCerts(mapped);
    } catch { toast.error('Erreur chargement certificats'); }
    finally { setLoading(false); }
  }, [search, filterStatut]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);
  useEffect(() => {
    webappsAPI.list().then(d => setApps(d.results)).catch(() => {});
  }, []);

  const handleDelete = async (id: number, domaine: string) => {
    if (!confirm(`Supprimer le certificat "${domaine}" ?`)) return;
    try {
      await certificatesAPI.delete(id);
      toast.success('Certificat supprimé');
      fetchCerts();
    } catch { toast.error('Erreur suppression'); }
  };

  const critiques = certs.filter(c => c.alert_level === 'critical' || c.alert_level === 'expired');

  return (
    <div className="page-container">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
            Gestion des Certificats SSL
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {certs.length} certificat(s) · {critiques.length > 0 ? <span style={{ color: '#ef4444' }}>{critiques.length} en alerte</span> : 'Tout est à jour'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchCerts} className="btn btn-ghost btn-sm"><RefreshCw size={13} /></button>
          <button onClick={() => { setEditCert(null); setShowModal(true); }} className="btn btn-primary">
            <Plus size={16} />
            Nouveau certificat
          </button>
        </div>
      </div>

      {/* Alertes */}
      {critiques.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {critiques.map(c => (
            <div key={c.id} className={`alert-banner alert-${c.alert_level === 'expired' ? 'critical' : 'critical'}`} style={{ marginBottom: 8 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>
                <strong>{c.domaine}</strong>
                {c.is_expired
                  ? ' — Expiré depuis ' + Math.abs(c.days_until_expiry) + ' jour(s)'
                  : ` — Expire dans ${c.days_until_expiry} jour(s) (${c.date_expiration})`}
                {c.application_nom && <span style={{ opacity: 0.7 }}> · {c.application_nom}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Rechercher (domaine, émetteur...)"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="valide">Valide</option>
          <option value="expire">Expiré</option>
          <option value="revoque">Révoqué</option>
        </select>
      </div>

      {/* Cartes certificats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="card" style={{ opacity: 0.5 }}>
              <div style={{ height: 100, background: '#334155', borderRadius: 8, animation: 'pulse 2s infinite' }} />
            </div>
          ))
        ) : certs.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
            <Shield size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>Aucun certificat SSL trouvé</p>
          </div>
        ) : (
          certs.map(cert => {
            const alertConf = ALERT_CONFIG[cert.alert_level] || ALERT_CONFIG.ok;
            
            // Calculate actual range validity percent
            const emissionTime = new Date(cert.date_emission).getTime();
            const expirationTime = new Date(cert.date_expiration).getTime();
            const totalDuration = expirationTime - emissionTime;
            const elapsed = Date.now() - emissionTime;
            const remainingPercent = totalDuration > 0
              ? Math.max(0, Math.min(100, 100 - (elapsed / totalDuration) * 100))
              : 0;

            return (
              <div key={cert.id} className="card" style={{
                borderColor: cert.alert_level !== 'ok' ? `${alertConf.color}40` : undefined,
                boxShadow: cert.alert_level !== 'ok' ? `0 4px 20px ${alertConf.color}10` : '0 4px 20px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ padding: '4px 8px', borderRadius: 6, background: `${alertConf.color}20`, color: alertConf.color, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500 }}>
                        {alertConf.icon}
                        {alertConf.label}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', wordBreak: 'break-all', display: 'flex', alignItems: 'center' }}>
                      {cert.is_expired ? (
                        <Unlock size={14} style={{ color: '#ef4444', marginRight: 6, flexShrink: 0 }} />
                      ) : (
                        <Lock size={14} style={{ color: '#10b981', marginRight: 6, flexShrink: 0 }} />
                      )}
                      {cert.domaine}
                    </div>
                    {cert.application_nom && (
                      <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4, fontWeight: 500 }}>
                        🔗 {cert.application_nom}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => { setEditCert(cert); setShowModal(true); }} className="btn btn-ghost btn-icon btn-sm" title="Modifier"><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(cert.id, cert.domaine)} className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }} title="Supprimer"><Trash2 size={12} /></button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10, paddingBottom: 10 }}>
                  <div>
                    <div style={{ color: '#64748b', marginBottom: 2 }}>Émetteur</div>
                    <div style={{ color: '#94a3b8', fontWeight: 500 }}>{cert.emetteur || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', marginBottom: 2 }}>Algorithme</div>
                    <div style={{ color: '#94a3b8', fontWeight: 500 }}>{cert.algorithme || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', marginBottom: 2 }}>Émis le</div>
                    <div style={{ color: '#94a3b8', fontWeight: 500 }}>{cert.date_emission}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', marginBottom: 2 }}>Expire le</div>
                    <div style={{ color: alertConf.color, fontWeight: 600 }}>{cert.date_expiration}</div>
                  </div>
                </div>

                {/* Barre de progression expiration */}
                <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                    <span>Validité restante</span>
                    <span style={{ color: alertConf.color, fontWeight: 600 }}>
                      {cert.is_expired ? 'Expiré' : `${cert.days_until_expiry} jours (${Math.round(remainingPercent)}%)`}
                    </span>
                  </div>
                  <div className="metric-bar" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="metric-bar-fill" style={{
                      width: `${remainingPercent}%`,
                      background: alertConf.color,
                      boxShadow: `0 0 8px ${alertConf.color}40`,
                    }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CertModal cert={editCert} apps={apps} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchCerts(); }} />
      )}
    </div>
  );
}

function CertModal({ cert, apps, onClose, onSaved }: {
  cert: SSLCertificate | null;
  apps: WebApplication[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    domaine: cert?.domaine || '',
    emetteur: cert?.emetteur || '',
    algorithme: cert?.algorithme || 'RSA 2048',
    date_emission: cert?.date_emission || today,
    date_expiration: cert?.date_expiration || '',
    statut: cert?.statut || 'valide',
    application: cert?.application || '',
    notes: cert?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Map frontend form properties to Django database columns
      const payload = {
        domaine: form.domaine,
        emetteur: form.emetteur,
        algorithme: form.algorithme,
        date_emission: form.date_emission,
        date_expiration: form.date_expiration,
        statut: form.statut,
        webapp: form.application ? parseInt(form.application) : null,
        notes: form.notes,
      };

      if (cert) {
        await certificatesAPI.update(cert.id, payload as any);
        toast.success('Certificat modifié');
      } else {
        await certificatesAPI.create(payload as any);
        toast.success('Certificat créé');
      }
      onSaved();
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const msg = errData ? Object.values(errData).flat().join(' ') : 'Erreur';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{cert ? 'Modifier le certificat' : 'Nouveau certificat SSL'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><span style={{ fontSize: 18 }}>×</span></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Domaine *</label>
              <input className="form-input" value={form.domaine} onChange={e => set('domaine', e.target.value)} required placeholder="portail.ddi.gov.mr" />
            </div>
            <div className="form-group">
              <label className="form-label">Émetteur / CA</label>
              <input className="form-input" value={form.emetteur} onChange={e => set('emetteur', e.target.value)} placeholder="Let's Encrypt" />
            </div>
            <div className="form-group">
              <label className="form-label">Algorithme</label>
              <select className="form-select" value={form.algorithme} onChange={e => set('algorithme', e.target.value)}>
                <option>RSA 2048</option>
                <option>RSA 4096</option>
                <option>ECDSA P-256</option>
                <option>ECDSA P-384</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date d'émission *</label>
              <input type="date" className="form-input" value={form.date_emission} onChange={e => set('date_emission', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Date d'expiration *</label>
              <input type="date" className="form-input" value={form.date_expiration} onChange={e => set('date_expiration', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Statut</label>
              <select className="form-select" value={form.statut} onChange={e => set('statut', e.target.value)}>
                <option value="valide">Valide</option>
                <option value="expire">Expiré</option>
                <option value="revoque">Révoqué</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Application web</label>
              <select className="form-select" value={form.application} onChange={e => set('application', e.target.value)}>
                <option value="">Aucune</option>
                {apps.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Sauvegarde...' : cert ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
