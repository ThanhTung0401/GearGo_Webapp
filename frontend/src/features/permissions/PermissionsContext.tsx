import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchQuyenCuaToi } from "../permissions";

type PermissionsCtxValue = {
  perms: Set<string>;
  version: number;
  roleName: string;
  loaded: boolean;
  hasPerm: (p?: string) => boolean;
  refetch: () => Promise<void>;
};
const PermissionsCtx = createContext<PermissionsCtxValue | null>(null);

// Ref để global apiClient có thể trigger refetch mà không cần qua React tree.
export const permissionsRef: { current: null | (() => Promise<void>) } = { current: null };

export function PermissionsProvider({ userId, children }: { userId: string | number | null; children: ReactNode }) {
  const [state, setState] = useState({ perms: new Set<string>(), version: 0, roleName: "", loaded: false });
  // Bộ đếm tuần tự chống race condition khi đổi tài khoản nhanh (bỏ qua kết quả request cũ)
  const requestSeqRef = useRef(0);

  const refetch = useCallback(async () => {
    if (userId == null || userId === "") return;
    const seq = ++requestSeqRef.current;
    const data = await fetchQuyenCuaToi();
    if (seq !== requestSeqRef.current) return;
    if (data) {
      setState({ perms: new Set(data.quyen), version: data.version, roleName: data.roleName, loaded: true });
    } else {
      setState((prev) => ({ ...prev, loaded: true }));
    }
  }, [userId]);

  // Reset đồng bộ ngay khi userId đổi để tránh flicker quyền tài khoản cũ, sau đó refetch
  useEffect(() => {
    requestSeqRef.current += 1;
    setState({ perms: new Set(), version: 0, roleName: "", loaded: false });
    void refetch();
  }, [userId, refetch]);

  // Expose cho global interceptor (apiClient 403)
  useEffect(() => {
    permissionsRef.current = refetch;
    return () => {
      permissionsRef.current = null;
    };
  }, [refetch]);

  // Đồng bộ quyền ngay khi admin lưu thay đổi hoặc khi người dùng focus lại tab trình duyệt
  useEffect(() => {
    const onChanged = () => void refetch();
    const onVis = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    window.addEventListener("geargo-permissions-changed", onChanged);
    window.addEventListener("geargo:permissions-changed", onChanged);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("geargo-permissions-changed", onChanged);
      window.removeEventListener("geargo:permissions-changed", onChanged);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refetch]);

  // Kiểm tra quyền 100% dựa vào danh sách quyền từ DB; Quản trị viên luôn toàn quyền
  const hasPerm = useCallback(
    (p?: string) => !p || state.roleName === "QuanTriVien" || state.perms.has(p),
    [state.perms, state.roleName]
  );

  const value = useMemo<PermissionsCtxValue>(() => ({ ...state, hasPerm, refetch }), [state, hasPerm, refetch]);
  return <PermissionsCtx.Provider value={value}>{children}</PermissionsCtx.Provider>;
}

export function usePermissionsContext() {
  return useContext(PermissionsCtx);
}

export function useHasPerm() {
  const ctx = useContext(PermissionsCtx);
  if (!ctx) return (_perm?: string) => true;
  return ctx.hasPerm;
}

export function Can({ perm, children, fallback = null }: { perm: string; children: ReactNode; fallback?: ReactNode }) {
  const hasPerm = useHasPerm();
  return <>{hasPerm(perm) ? children : fallback}</>;
}
