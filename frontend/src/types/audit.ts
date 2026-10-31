// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  targetEntity: string;
  targetId: string;
  detail: string;
}
