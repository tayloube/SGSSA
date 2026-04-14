'use client';
import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '@/lib/api';
import type { User, Role } from '@/types';
import { Shield, Plus, MoreVertical, Trash2, Edit2, Search, User as UserIcon, Power, ShieldX } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await usersAPI.list(search ? { search } : undefined);
      setUsers(data.results);
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Toute suppression est définitive. Supprimer l'utilisateur "${nom}" ?`)) return;
    try {
      await usersAPI.delete(id);
      toast.success(`Utilisateur "${nom}" supprimé`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleToggleStatus = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row clicks if any
    try {
      const res = await usersAPI.toggle(id);
      toast.success(res.message);
      fetchUsers();
    } catch {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setShowModal(true);
  };
  
  const openNew = () => {
    setEditUser(null);
    setShowModal(true);
  };

  return (
    <div className="page-container">
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={24} color="#3b82f6" /> Gestion des Utilisateurs
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Gérez les accès et les rôles de votre équipe ({users.length} comptes)
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', minWidth: 250 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              className="form-input"
              style={{ paddingLeft: 32 }}
              type="text" 
              placeholder="Rechercher (nom, email)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Nouvel Utilisateur
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Chargement...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Dernière Connexion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '50%', 
                          background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12
                        }}>
                          {user.prenom[0]}{user.nom[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{user.nom_complet}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      <span className={user.est_actif ? "badge badge-actif" : "badge badge-inactif"}>
                        <div className={`live-dot ${user.est_actif ? 'live-dot-green' : 'live-dot-red'}`} style={{ width: 6, height: 6 }} />
                        {user.est_actif ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      {user.derniere_connexion 
                        ? format(new Date(user.derniere_connexion), 'dd MMM yyyy - HH:mm', { locale: fr })
                        : 'Jamais connecté'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(user)} className="btn btn-ghost btn-icon btn-sm" title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={(e) => handleToggleStatus(user.id, e)} className="btn btn-ghost btn-icon btn-sm" title={user.est_actif ? 'Suspendre l\'accès' : 'Réactiver l\'accès'} style={{ color: user.est_actif ? '#fbbf24' : '#10b981' }}>
                          <Power size={13} />
                        </button>
                        <button onClick={() => handleDelete(user.id, user.nom_complet)} className="btn btn-ghost btn-icon btn-sm" title="Supprimer" style={{ color: '#ef4444' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Aucun utilisateur trouvé.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Formulaire */}
      {showModal && (
        <UserFormModal 
          user={editUser}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composants Annexes
// ─────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const colors = {
    admin: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', icon: Shield },
    superviseur: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', icon: Search },
    technicien: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', icon: Edit2 },
    lecteur: { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', icon: UserIcon }
  };
  const style = colors[role] || colors.lecteur;
  const Icon = style.icon;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: style.bg, color: style.text,
      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, textTransform: 'capitalize'
    }}>
      <Icon size={14} /> {role}
    </span>
  );
}

function UserFormModal({ user, onClose, onSuccess }: { user: User | null, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    role: user?.role || 'lecteur',
    password: '',
    password_confirm: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && formData.password !== formData.password_confirm) {
        return toast.error("Les mots de passe ne correspondent pas.");
    }
    
    setSubmitting(true);
    try {
      if (user) {
        // En mode édition, s'il n'a pas tapé de MDP, on ne l'envoie pas
        const dataToSend = { ...formData };
        if (!dataToSend.password) {
            delete (dataToSend as any).password;
            delete (dataToSend as any).password_confirm;
        }
        await usersAPI.update(user.id, dataToSend as any);
        toast.success("Utilisateur modifié");
      } else {
        await usersAPI.create(formData as any);
        toast.success("Utilisateur créé");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.email?.[0] || 'Erreur de sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserIcon size={18} style={{ color: '#60a5fa' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><span style={{ fontSize: 18 }}>×</span></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input type="text" className="form-input" required value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input type="text" className="form-input" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
            </div>
          
          <div className="form-group" style={{ gridColumn: '1/3' }}>
            <label className="form-label">Adresse Courriel *</label>
            <input type="email" className="form-input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Numéro de Téléphone</label>
            <input type="text" className="form-input" placeholder="+123..." value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
          </div>
             
          <div className="form-group">
            <label className="form-label">Rôle *</label>
            <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                <option value="lecteur">Lecteur</option>
                <option value="technicien">Technicien</option>
                <option value="superviseur">Superviseur</option>
                <option value="admin">Administrateur</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe {user ? '(Optionnel)' : '*'}</label>
            <input type="password" minLength={6} className="form-input" required={!user} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe {user ? '(Optionnel)' : '*'}</label>
            <input type="password" minLength={6} className="form-input" required={!user && formData.password.length > 0} value={formData.password_confirm} onChange={e => setFormData({...formData, password_confirm: e.target.value})} />
          </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingBottom: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
