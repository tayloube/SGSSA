'use client';
/**
 * Client API centralisé — SGSSA
 * Gère automatiquement l'injection du token JWT et le refresh
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import type {
  AuthTokens, User, Server, Rack, Software,
  WebApplication, SSLCertificate, DashboardStats,
  PaginatedResponse, EventLog, ServerMetric
} from '@/types';

const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== "") return envUrl;
  
  // SSR Safe: On vérifie si window est défini
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return ''; // Valeur vide pendant le SSR
};

const API_URL = getApiUrl();

// ─────────────────────────────────────────────────────────────
// Instance Axios
// ─────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Injection automatique du token JWT
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automatique si token expiré
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = Cookies.get('refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh/`, {
            refresh: refreshToken,
          });
          Cookies.set('access_token', data.access, { expires: 1 });
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access}`;
          }
          return api(originalRequest);
        } catch {
          // Refresh échoué → déconnexion
          authAPI.logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email: string, password: string): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>('/auth/login/', { email, password });
    Cookies.set('access_token', data.access, { expires: 1/24 }); // 1h
    Cookies.set('refresh_token', data.refresh, { expires: 7 });
    return data;
  },

  logout: async () => {
    try {
      const refresh = Cookies.get('refresh_token');
      if (refresh) await api.post('/auth/logout/', { refresh_token: refresh });
    } catch { /* ignore */ } finally {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
    }
  },

  me: (): Promise<User> =>
    api.get<User>('/auth/me/').then(r => r.data),

  changePassword: (data: { old_password: string; new_password: string; new_password_confirm: string }) =>
    api.post('/auth/change-password/', data).then(r => r.data),
};

// ─────────────────────────────────────────────────────────────
// Users API
// ─────────────────────────────────────────────────────────────
export const usersAPI = {
  list:   (params?: Record<string, unknown>) => api.get<PaginatedResponse<User>>('/auth/users/', { params }).then(r => r.data),
  get:    (id: number) => api.get<User>(`/auth/users/${id}/`).then(r => r.data),
  create: (data: Partial<User> & { password: string; password_confirm: string }) => api.post<User>('/auth/users/', data).then(r => r.data),
  update: (id: number, data: Partial<User>) => api.patch<User>(`/auth/users/${id}/`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/auth/users/${id}/`),
  toggle: (id: number) => api.post(`/auth/users/${id}/toggle-status/`).then(r => r.data),
};

// ─────────────────────────────────────────────────────────────
// Servers API
// ─────────────────────────────────────────────────────────────
export const serversAPI = {
  list:         (params?: Record<string, unknown>) => api.get<PaginatedResponse<Server>>('/servers/', { params }).then(r => r.data),
  get:          (id: number) => api.get<Server>(`/servers/${id}/`).then(r => r.data),
  create:       (data: Partial<Server>) => api.post<Server>('/servers/', data).then(r => r.data),
  update:       (id: number, data: Partial<Server>) => api.patch<Server>(`/servers/${id}/`, data).then(r => r.data),
  delete:       (id: number) => api.delete(`/servers/${id}/`),
  metrics:      (id: number, limit = 100) => api.get<ServerMetric[]>(`/servers/${id}/metrics/`, { params: { limit } }).then(r => r.data),
  changeStatus: (id: number, statut: string) => api.post(`/servers/${id}/change-status/`, { statut }).then(r => r.data),
  stats:        () => api.get('/servers/stats/').then(r => r.data),
};

// ─────────────────────────────────────────────────────────────
// Racks API
// ─────────────────────────────────────────────────────────────
export const racksAPI = {
  list:   (params?: Record<string, unknown>) => api.get<PaginatedResponse<Rack>>('/racks/', { params }).then(r => r.data),
  get:    (id: number) => api.get<Rack>(`/racks/${id}/`).then(r => r.data),
  create: (data: Partial<Rack>) => api.post<Rack>('/racks/', data).then(r => r.data),
  update: (id: number, data: Partial<Rack>) => api.patch<Rack>(`/racks/${id}/`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/racks/${id}/`),
};

// ─────────────────────────────────────────────────────────────
// Software API
// ─────────────────────────────────────────────────────────────
export const softwareAPI = {
  list:   (params?: Record<string, unknown>) => api.get<PaginatedResponse<Software>>('/software/', { params }).then(r => r.data),
  get:    (id: number) => api.get<Software>(`/software/${id}/`).then(r => r.data),
  create: (data: Partial<Software>) => api.post<Software>('/software/', data).then(r => r.data),
  update: (id: number, data: Partial<Software>) => api.patch<Software>(`/software/${id}/`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/software/${id}/`),
};

// ─────────────────────────────────────────────────────────────
// WebApps API
// ─────────────────────────────────────────────────────────────
export const webappsAPI = {
  list:   (params?: Record<string, unknown>) => api.get<PaginatedResponse<WebApplication>>('/webapps/', { params }).then(r => r.data),
  get:    (id: number) => api.get<WebApplication>(`/webapps/${id}/`).then(r => r.data),
  create: (data: Partial<WebApplication>) => api.post<WebApplication>('/webapps/', data).then(r => r.data),
  update: (id: number, data: Partial<WebApplication>) => api.patch<WebApplication>(`/webapps/${id}/`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/webapps/${id}/`),
};

// ─────────────────────────────────────────────────────────────
// Certificates API
// ─────────────────────────────────────────────────────────────
export const certificatesAPI = {
  list:    (params?: Record<string, unknown>) => api.get<PaginatedResponse<SSLCertificate>>('/certificates/', { params }).then(r => r.data),
  get:     (id: number) => api.get<SSLCertificate>(`/certificates/${id}/`).then(r => r.data),
  create:  (data: Partial<SSLCertificate>) => api.post<SSLCertificate>('/certificates/', data).then(r => r.data),
  update:  (id: number, data: Partial<SSLCertificate>) => api.patch<SSLCertificate>(`/certificates/${id}/`, data).then(r => r.data),
  delete:  (id: number) => api.delete(`/certificates/${id}/`),
  alertes: () => api.get<{ count: number; certificats: SSLCertificate[] }>('/certificates/alertes/').then(r => r.data),
};

// ─────────────────────────────────────────────────────────────
// Dashboard API
// ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  stats: () => api.get<DashboardStats>('/dashboard/stats/').then(r => r.data),
  logs:  (params?: { limit?: number; action?: string }) =>
    api.get<{ count: number; evenements: EventLog[] }>('/dashboard/logs/', { params }).then(r => r.data),
};

export default api;
