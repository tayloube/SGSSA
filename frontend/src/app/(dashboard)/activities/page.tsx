'use client';
/**
4:  * Page Historique d'Activités — SGSSA
5:  */
import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '@/lib/api';
import type { EventLog } from '@/types';
import toast from 'react-hot-toast';
import {
  Activity, Search, RefreshCw, Server, Shield, Package, LogIn, HelpCircle, User, Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORIES = [
  { id: 'ALL', label: 'Toutes', icon: Activity, color: '#3b82f6' },
  { id: 'SERVER', label: 'Serveurs', icon: Server, color: '#10b981' },
  { id: 'SSL', label: 'Certificats SSL', icon: Shield, color: '#f59e0b' },
  { id: 'SOFTWARE', label: 'Logiciels', icon: Package, color: '#818cf8' },
  { id: 'LOGIN', label: 'Connexions', icon: LogIn, color: '#ec4899' },
  { id: 'OTHER', label: 'Autres', icon: HelpCircle, color: '#64748b' }
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [count, setCount] = useState(0);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (selectedCategory !== 'ALL') {
        params.category = selectedCategory;
      }
      if (search) {
        params.search = search;
      }
      const data = await dashboardAPI.activities(params);
      setActivities(data.results);
      setCount(data.count);
    } catch {
      toast.error("Erreur de chargement du journal d'activités");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getCategoryDetails = (cat: string) => {
    return CATEGORIES.find(c => c.id === cat) || CATEGORIES[5];
  };

  return (
    <div className="page-container">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={20} style={{ color: '#3b82f6' }} /> Journal des Activités
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {count} événement(s) enregistré(s) dans le système
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchActivities} className="btn btn-ghost btn-sm" title="Actualiser">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Catégories de filtrage */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16, scrollbarWidth: 'none' }} className="no-scrollbar">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: isActive ? cat.color : 'rgba(255, 255, 255, 0.08)',
                background: isActive ? `${cat.color}15` : 'rgba(255, 255, 255, 0.02)',
                color: isActive ? '#f1f5f9' : '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={14} style={{ color: cat.color }} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Barre de recherche */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Rechercher par description, utilisateur, action..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tableau des Événements */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Catégorie</th>
                <th style={{ width: '130px' }}>Action</th>
                <th>Détails de l'événement</th>
                <th style={{ width: '160px' }}>Utilisateur</th>
                <th style={{ width: '140px' }}>Adresse IP</th>
                <th style={{ width: '180px' }}>Date & Heure</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Chargement...</td></tr>
              ) : activities.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Aucun événement enregistré</td></tr>
              ) : (
                activities.map(act => {
                  const cat = getCategoryDetails(act.category);
                  const CatIcon = cat.icon;
                  const dateVal = act.created_at || act.horodatage;
                  return (
                    <tr key={act.id}>
                      <td>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: `${cat.color}12`,
                          border: `1px solid ${cat.color}25`,
                          color: '#f1f5f9',
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          <CatIcon size={12} style={{ color: cat.color }} />
                          {cat.label}
                        </div>
                      </td>
                      <td>
                        <code style={{
                          background: 'rgba(0,0,0,0.25)',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#e2e8f0',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          {act.action}
                        </code>
                      </td>
                      <td style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                        {act.details}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8'
                          }}>
                            <User size={12} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 12 }}>{act.utilisateur || 'Système'}</div>
                            {act.utilisateur_email && <div style={{ fontSize: 10, color: '#64748b' }}>{act.utilisateur_email}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                        {act.ip_address || '—'}
                      </td>
                      <td style={{ fontSize: 12, color: '#94a3b8' }}>
                        {dateVal ? format(new Date(dateVal), 'dd MMM yyyy HH:mm:ss', { locale: fr }) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
