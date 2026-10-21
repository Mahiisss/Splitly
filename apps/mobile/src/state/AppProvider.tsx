import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import {
  APP_STORAGE_KEY,
  LEGACY_GROUP_STORAGE_KEY,
  appReducer,
  demoGroup,
  loadAppState,
  sampleAppState,
  serializeAppState,
  type AppAction,
  type AppState,
  type Group,
} from "@splitly/core";

export interface Toast {
  message: string;
  /** Shows an "Undo" button that runs this. */
  onUndo?: () => void;
}

interface Store {
  app: AppState;
  /** False until the saved data has been read from the phone. */
  loaded: boolean;
}

type StoreAction = AppAction | { type: "hydrate"; state: AppState };

function storeReducer(store: Store, action: StoreAction): Store {
  if (action.type === "hydrate") return { app: action.state, loaded: true };
  return { ...store, app: appReducer(store.app, action) };
}

interface AppContextValue extends Store {
  dispatch: (action: AppAction) => void;
  toast: Toast | null;
  showToast: (toast: Toast) => void;
  dismissToast: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * All groups, shared by every screen and saved on the phone with AsyncStorage.
 * Uses the same appReducer and loadAppState as the web app, from @splitly/core.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(storeReducer, { app: sampleAppState, loaded: false });
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet([APP_STORAGE_KEY, LEGACY_GROUP_STORAGE_KEY])
      .then(([[, app], [, legacyGroup]]) =>
        dispatch({ type: "hydrate", state: loadAppState({ app, legacyGroup }, sampleAppState, demoGroup.id) }),
      )
      .catch(() => dispatch({ type: "hydrate", state: sampleAppState })); // storage unavailable
  }, []);

  useEffect(() => {
    if (store.loaded) AsyncStorage.setItem(APP_STORAGE_KEY, serializeAppState(store.app)).catch(() => {});
  }, [store]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.onUndo ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <AppContext.Provider value={{ ...store, dispatch, toast, showToast: setToast, dismissToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <AppProvider>");
  return value;
}

/** One group by id, or undefined if it doesn't exist (any more). */
export function useGroup(id: string | undefined): Group | undefined {
  const { app } = useApp();
  return app.groups.find((g) => g.id === id);
}
