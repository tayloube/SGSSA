// Types TypeScript centralisés — SGSSA

export type Role = 'admin' | 'superviseur' | 'technicien' | 'lecteur';

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  nom_complet: string;
  role: Role;
  est_actif: boolean;
  telephone?: string;
  avatar?: string;
  date_creation: string;
  derniere_connexion?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    nom_complet: string;
    role: Role;
    avatar?: string;
  };
}

export type StatutServeur = 'actif' | 'inactif' | 'maintenance';
export type TypeServeur   = 'physique' | 'virtuel' | 'cloud';

export interface Rack {
  id: number;
  nom: string;
  datacenter: string;
  localisation?: string;
  total_unites_u: number;
  description?: string;
  serveurs_count: number;
  usage_percent: number;
  serveurs: Array<{ id: number; nom: string; adresse_ip: string; statut: StatutServeur; type: TypeServeur }>;
  created_at: string;
}

export interface ServerMetric {
  id: number;
  utilisation_cpu: number;
  utilisation_ram: number;
  utilisation_disque: number;
  cpu_temp?: number;
  uptime_secondes: number;
  uptime_formate: string;
  charge_reseau_entrant: number;
  charge_reseau_sortant: number;
  is_critical: boolean;
  horodatage: string;
}

export interface Server {
  id: number;
  nom: string;
  adresse_ip: string;
  adresse_ip_secondaire?: string;
  systeme_exploitation: string;
  type: TypeServeur;
  statut: StatutServeur;
  cpu_coeurs: number;
  cpu_modele?: string;
  ram_go: number;
  stockage_go: number;
  date_acquisition?: string;
  description?: string;
  rack?: number;
  rack_nom?: string;
  derniere_metrique?: {
    cpu: number;
    ram: number;
    disk: number;
    temp?: number;
    timestamp: string;
  };
  dernier_snapshot?: {
    id: number;
    image: string;
    timestamp: string;
  };
  metriques_recentes?: ServerMetric[];
  apps_count: number;
  logiciels_count: number;
  created_at: string;
}

export interface Software {
  id: number;
  nom: string;
  version?: string;
  type_licence: 'libre' | 'commercial' | 'oem' | 'essai';
  editeur?: string;
  date_installation?: string;
  date_expiration_licence?: string;
  description?: string;
  serveur: number;
  serveur_nom: string;
  is_licence_expired: boolean;
  created_at: string;
}

export type StatutApp = 'en_ligne' | 'hors_ligne' | 'maintenance';

export interface WebApplication {
  id: number;
  nom: string;
  url: string;
  port?: number;
  technologie?: string;
  statut: StatutApp;
  description?: string;
  date_deploiement?: string;
  contact_responsable?: string;
  serveur: number;
  serveur_nom: string;
  is_online: boolean;
  cert_statut?: string;
  cert_expiration?: string;
  created_at: string;
}

export type AlertLevel = 'ok' | 'warning' | 'critical' | 'expired';
export type StatutCert = 'valide' | 'expire' | 'revoque';

export interface SSLCertificate {
  id: number;
  domaine: string;
  emetteur?: string;
  algorithme?: string;
  date_emission: string;
  date_expiration: string;
  statut: StatutCert;
  chemin_fichier?: string;
  notes?: string;
  application?: number;
  application_nom?: string;
  application_url?: string;
  days_until_expiry: number;
  is_expired: boolean;
  alert_level: AlertLevel;
  created_at: string;
}

export interface DashboardStats {
  serveurs: {
    total: number;
    actifs: number;
    inactifs: number;
    maintenance: number;
    metriques_moy: { cpu: number; ram: number; disk: number };
  };
  applications: {
    total: number;
    en_ligne: number;
    hors_ligne: number;
    maintenance: number;
  };
  certificats: {
    total: number;
    valides: number;
    attention: number;
    critiques: number;
    expires: number;
  };
  racks: { total: number };
  logiciels: { total: number };
  alertes: Array<{
    type: string;
    niveau: string;
    message: string;
    details: Record<string, unknown>;
  }>;
  evenements_recents: Array<{
    id: number;
    action: string;
    details: string;
    utilisateur: string;
    horodatage: string;
  }>;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface EventLog {
  id: number;
  action: string;
  details: string;
  utilisateur: string;
  utilisateur_email?: string;
  ip?: string;
  horodatage: string;
}
