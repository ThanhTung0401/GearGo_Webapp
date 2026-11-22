import { AppContext, useApp, type Page, type AppState } from "./context";
import { useAppProviderValue } from "./hooks/useAppProviderValue";
import { AppRouterView } from "./routes/AppRouterView";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";

// Giữ re-export để tương thích ngược với toàn bộ import từ ./App
export { AppContext, useApp, type Page, type AppState };

/**
 * Root component của ứng dụng GearGo.
 */
export default function App() {
  const { state, page, currentUser, permissionNotice, dismissPermissionNotice } = useAppProviderValue();

  return (
    <AppErrorBoundary>
      <AppContext.Provider value={state}>
        <AppRouterView
          page={page}
          currentUser={currentUser}
          permissionNotice={permissionNotice}
          dismissPermissionNotice={dismissPermissionNotice}
        />
      </AppContext.Provider>
    </AppErrorBoundary>
  );
}
