export interface AuditLogEntry {
  timestamp: string;
  action: string;
  details: string;
}

export const AuditService = {
  log: (action: string, details: string) => {
    const logs = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]');
    logs.push({ timestamp: new Date().toISOString(), action, details });
    localStorage.setItem('admin_audit_logs', JSON.stringify(logs));
  },
  getLogs: (): AuditLogEntry[] => {
    return JSON.parse(localStorage.getItem('admin_audit_logs') || '[]');
  }
};
