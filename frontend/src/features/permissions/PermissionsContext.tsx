import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchQuyenCuaToi } from "../permissions";

type PermissionsCtxValue = { perms: Set<string>; version: number; roleName: string; hasPerm: (p?: string) => boolean; refetch: () => Promise<void> };
const PermissionsCtx = createContext<PermissionsCtxValue | null>(null);

// Ref để global apiClient có thể trigger refetch mà không cần qua React tree.
export const permissionsRef: { current: null | (() => Promise<void>) } = { current: null };

export function PermissionsProvider({ userId, children }: { userId: number | null; children: ReactNode }) {
  const [state, setState] = useState({ perms: new Set<string>(), version: 0, roleName: "" });

  const refetch = useCallback(async () => {
    if (userId == null) return; // state đã được useEffect bên dưới reset đồng bộ
    const data = await fetchQuyenCuaToi();
    if (data) setState({ perms: new Set(data.quyen), version: data.version, roleName: data.roleName });
  }, [userId]);

  // Reset đồng bộ ngay khi userId đổi (N6 fix: tránh flicker quyền tài khoản cũ trong vòng render chờ fetch), sau đó refetch cho userId mới.
  useEffect(() => {
    setState({ perms: new Set(), version: 0, roleName: "" });
    refetch();
  }, [userId, refetch]);

  // Expose cho global interceptor (L4 fix)
  useEffect(() => { permissionsRef.current = refetch; return () => { permissionsRef.current = null; }; }, [refetch]);

  // Refetch khi focus lại tab
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refetch]);

  // Memo hoá hasPerm (L8 fix) để không trigger re-render con — 100% dựa vào quyền từ DB, không hardcode roleName
  const hasPerm = useCallback(
    (p?: string) => !p || state.perms.has(p),
    [state.perms]
  );

  const value = useMemo<PermissionsCtxValue>(() => ({ ...state, hasPerm, refetch }), [state, hasPerm, refetch]);
  return <PermissionsCtx.Provider value={value}>{children}</PermissionsCtx.Provider>;
}

export function useHasPerm() {
  const ctx = useContext(PermissionsCtx);
  // v2 §P3 — fallback no-op cho test / component render ngoài Provider (hiển thị mọi button cho an toàn UX).
  if (!ctx) return (_perm?: string) => true;
  return ctx.hasPerm;
}

export function Can({ perm, children, fallback = null }: { perm: string; children: ReactNode; fallback?: ReactNode }) {
  const hasPerm = useHasPerm();
  return <>{hasPerm(perm) ? children : fallback}</>;
}
