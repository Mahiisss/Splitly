"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import {
  APP_STORAGE_KEY,
  LEGACY_GROUP_STORAGE_KEY,
  appReducer,
  goaTripId,
  loadAppState,
  sampleAppState,
  serializeAppState,
  type AppAction,
  type AppState,
} from "@splitly/core";

export interface Toast {
  message: string;
  /** Shows an "Undo" button that runs this. */
  onUndo?: () => void;
}

interface Store {
  app: AppState;
  /** False until the saved data has been read from this browser. */
  loaded: boolean;
}

type StoreAction = AppAction | { type: "hydrate"; state: AppState };

function storeReducer(store: Store, action: StoreAction): Store {
  if (action.type === "hydrate") return { app: action.state, loaded: true };
  return { ...store, app: appReducer(store.app, action) };
}

interface AppStoreValue extends Store {
  dispatch: (action: AppAction) => void;
  toast: Toast | null;
  showToast: (toast: Toast) => void;
  dismissToast: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

/**
 * All groups, saved in this browser's localStorage and shared by every page.
 *
 * Nothing is read from storage during the first render, because the server
 * can't see this browser's storage and the HTML would differ (a React
 * hydration error). Pages show a loading skeleton until `loaded` is true.
 */
export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(storeReducer, { app: sampleAppState, loaded: false });
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const state = loadAppState(
      { app: readStorage(APP_STORAGE_KEY), legacyGroup: readStorage(LEGACY_GROUP_STORAGE_KEY) },
      sampleAppState,
      goaTripId,
    );
    dispatch({ type: "hydrate", state });
  }, []);

  useEffect(() => {
    if (store.loaded) writeStorage(APP_STORAGE_KEY, serializeAppState(store.app));
  }, [store]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.onUndo ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <AppStoreContext.Provider value={{ ...store, dispatch, toast, showToast: setToast, dismissToast }}>
      {children}
      <ToastRegion toast={toast} onDismiss={dismissToast} />
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext);
  if (!value) throw new Error("useAppStore must be used inside <AppStoreProvider>");
  return value;
}

function ToastRegion({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
      {toast && (
        <div className="pointer-events-auto flex items-center gap-4 rounded-full bg-ink py-2.5 pr-2.5 pl-5 text-sm font-medium text-canvas shadow-lg">
          <p>{toast.message}</p>
          {toast.onUndo ? (
            <button
              type="button"
              onClick={() => {
                toast.onUndo?.();
                onDismiss();
              }}
              className="rounded-full bg-primary px-3.5 py-1.5 font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Undo
            </button>
          ) : (
            <span className="pr-2.5" />
          )}
        </div>
      )}
    </div>
  );
}

// Storage can be unavailable (private browsing, blocked cookies, full quota).
// The app still works then; it just won't remember changes.
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore: see above
  }
}
