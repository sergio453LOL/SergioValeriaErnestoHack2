import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, clearToken, getToken, setToken, setUnauthorizedHandler, toApiError } from '../api/client';
import * as endpoints from '../api/endpoints';
import type { LoginRequest, LoginResponse, RegisterRequest, Team, User } from '../api/types';
import { clearWantedCache } from '../pages/wanted/wantedCache';
import { clearNewsCache } from '../pages/news/newsStore';

// Cada tripulación tiene su workspace: al cambiar de sesión no se reutiliza nada en memoria.
function clearCaches(): void {
  clearWantedCache();
  clearNewsCache();
}

export type AuthState =
  | { status: 'checking' }
  | { status: 'restore-error'; error: ApiError }
  | { status: 'anonymous'; expired: boolean }
  | { status: 'authenticated'; user: User; team: Team; expiresAt: string };

interface AuthContextValue {
  state: AuthState;
  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => void;
  retryRestore: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// setTimeout no acepta más de ~24.8 días.
const MAX_TIMEOUT = 2_147_483_647;

export function AuthProvider({ children }: { children: ReactNode }) {
  // Si hay token arrancamos en "checking": nunca se muestra el login mientras se verifica.
  const [state, setState] = useState<AuthState>(() =>
    getToken() ? { status: 'checking' } : { status: 'anonymous', expired: false },
  );
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  // Restaurar sesión al recargar con GET /auth/me.
  useEffect(() => {
    if (!getToken()) return;
    const controller = new AbortController();
    setState({ status: 'checking' });
    endpoints
      .getMe(controller.signal)
      .then((me) => setState({ status: 'authenticated', user: me.user, team: me.team, expiresAt: me.expiresAt }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = toApiError(error);
        if (apiError.status === 401) {
          setState({ status: 'anonymous', expired: true });
        } else {
          // Error de red o del servidor: el token puede seguir siendo válido, ofrecemos reintento.
          setState({ status: 'restore-error', error: apiError });
        }
      });
    return () => controller.abort();
  }, [restoreAttempt]);

  // Cualquier 401 de la API (token vencido o revocado) devuelve al login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearCaches();
      setState({ status: 'anonymous', expired: true });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Cerrar la sesión cuando llega expiresAt, aunque el usuario no haga ninguna request.
  const expiresAt = state.status === 'authenticated' ? state.expiresAt : null;
  useEffect(() => {
    if (!expiresAt) return;
    const delay = Math.min(Math.max(new Date(expiresAt).getTime() - Date.now(), 0), MAX_TIMEOUT);
    const timer = window.setTimeout(() => {
      clearToken();
      clearCaches();
      setState({ status: 'anonymous', expired: true });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  const startSession = useCallback((response: LoginResponse) => {
    setToken(response.token);
    clearCaches();
    setState({ status: 'authenticated', user: response.user, team: response.team, expiresAt: response.expiresAt });
  }, []);

  const login = useCallback(
    async (body: LoginRequest) => {
      try {
        startSession(await endpoints.login(body));
      } catch (error) {
        throw toApiError(error);
      }
    },
    [startSession],
  );

  const register = useCallback(
    async (body: RegisterRequest) => {
      try {
        startSession(await endpoints.register(body));
      } catch (error) {
        throw toApiError(error);
      }
    },
    [startSession],
  );

  const logout = useCallback(() => {
    clearToken();
    clearCaches();
    setState({ status: 'anonymous', expired: false });
  }, []);

  const retryRestore = useCallback(() => setRestoreAttempt((value) => value + 1), []);

  const value = useMemo(
    () => ({ state, login, register, logout, retryRestore }),
    [state, login, register, logout, retryRestore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
