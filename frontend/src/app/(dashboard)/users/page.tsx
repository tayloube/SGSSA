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
          <h1 className="page-title"><Shield size={28} color="#3b82f6" /> Gestion des Utilisateurs</h1>
          <p className="page-subtitle">Gérez les accès et les rôles de votre équipe ({users.length} comptes)</p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar">
            <Search size={18} color="#64748b" />
            <input 
              type="text" 
              placeholder="Rechercher (nom, email)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={20} /> Nouvel Utilisateur
          </button>
        </div>
      </div>

      {/* Liste des Utilisateurs */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Chargement...</div>
      ) : (
        <div className="card">
          <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Utilisateur</th>
                <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Rôle</th>
                <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Statut</th>
                <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Dernière Connexion</th>
                <th style={{ padding: '16px', width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="hover-bg" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 40, height: 40, borderRadius: '50%', 
                        background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                      }}>
                        {user.prenom[0]}{user.nom[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{user.nom_complet}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <RoleBadge role={user.role} />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                      background: user.est_actif ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: user.est_actif ? '#10b981' : '#ef4444'
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      {user.est_actif ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>
                    {user.derniere_connexion 
                      ? format(new Date(user.derniere_connexion), 'dd MMM yyyy - HH:mm', { locale: fr })
                      : 'Jamais connecté'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-ghost btn-icon">
                        <MoreVertical size={18} />
                      </label>
                      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-slate-800 rounded-box w-52" style={{ zIndex: 10 }}>
                        <li><a onClick={() => openEdit(user)}><Edit2 size={16}/> Éditer</a></li>
                        <li>
                          <a onClick={(e) => handleToggleStatus(user.id, e)} className={user.est_actif ? "text-orange-400" : "text-emerald-400"}>
                            <Power size={16}/> {user.est_actif ? 'Suspendre l\'accès' : 'Réactiver l\'accès'}
                          </a>
                        </li>
                        <li><a onClick={() => handleDelete(user.id, user.nom_complet)} className="text-red-400"><Trash2 size={16}/> Supprimer</a></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Aucun utilisateur trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><span style={{ fontSize: 18 }}>×</span></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-control" style={{ flex: 1 }}>
              <label>Prénom *</label>
              <input type="text" className="input" required value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
            </div>
            <div className="form-control" style={{ flex: 1 }}>
              <label>Nom *</label>
              <input type="text" className="input" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
            </div>
          </div>
          
          <div className="form-control">
            <label>Adresse Courriel *</label>
            <input type="email" className="input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
             <div className="form-control" style={{ flex: 1 }}>
                <label>Numéro de Téléphone</label>
                <input type="text" className="input" placeholder="+123..." value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
             </div>
             
             <div className="form-control" style={{ flex: 1 }}>
                <label>Rôle *</label>
                <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                    <option value="lecteur">Lecteur</option>
                    <option value="technicien">Technicien</option>
                    <option value="superviseur">Superviseur</option>
                    <option value="admin">Administrateur</option>
                </select>
            </div>
          </div>

          <div className="form-control" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Mot de passe {user ? '(Laissez vide pour conserver)' : '*'}</label>
            </div>
            <input type="password" minLength={6} className="input" required={!user} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          {(!user || formData.password.length > 0) && (
              <div className="form-control">
                <label>Confirmer le mot de passe *</label>
                <input type="password" minLength={6} className="input" required value={formData.password_confirm} onChange={e => setFormData({...formData, password_confirm: e.target.value})} />
              </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
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
