'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface CriticalAlert {
  id: string;
  server_id: number;
  server_nom: string;
  message: string;
  timestamp: Date;
}

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);

  useEffect(() => {
    const handleAlert = (event: any) => {
      if (event.detail?.type === 'critical_alert') {
        const newAlert = {
          id: `${event.detail.server_id}-${Date.now()}`,
          server_id: event.detail.server_id,
          server_nom: event.detail.server_nom,
          message: event.detail.message,
          timestamp: new Date()
        };
        
        setAlerts(prev => {
          // Éviter les doublons trop fréquents pour le même serveur
          const exists = prev.find(a => a.server_id === newAlert.server_id && a.message === newAlert.message);
          if (exists) return prev;
          return [newAlert, ...prev].slice(0, 3); // Garder les 3 plus récentes
        });
      }
    };

    window.addEventListener('sgssa_ws_message', handleAlert);
    return () => window.removeEventListener('sgssa_ws_message', handleAlert);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="critical-alert-container">
      {alerts.map((alert) => (
        <div key={alert.id} className="critical-alert-item">
          <div className="alert-content">
            <div className="alert-icon-ring">
              <AlertTriangle size={16} />
            </div>
            <div className="alert-text">
              <span className="alert-title">ALERTE CRITIQUE : {alert.server_nom}</span>
              <span className="alert-desc">{alert.message}</span>
            </div>
          </div>
          <button 
            onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            className="alert-close"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <style jsx>{`
        .critical-alert-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .critical-alert-item {
          background: #ef4444;
          color: white;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        .alert-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .alert-icon-ring {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .alert-text {
          display: flex;
          flex-direction: column;
        }
        .alert-title {
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .alert-desc {
          font-size: 14px;
          opacity: 0.95;
        }
        .alert-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .alert-close:hover {
          background: rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
