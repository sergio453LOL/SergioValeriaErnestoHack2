import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, type Location } from 'react-router';
import { useAuth } from './AuthContext';
import FullScreenMessage from '../components/FullScreenMessage';
import ErrorState from '../components/ErrorState';

// Estado que viaja hacia /login: a dónde quería ir el usuario y si la sesión venció.
export interface LoginRedirectState {
  from?: { pathname: string; search: string; hash: string };
  expired?: boolean;
}

export function readLoginState(state: unknown): LoginRedirectState {
  if (typeof state !== 'object' || state === null) return {};
  const value = state as Record<string, unknown>;
  const result: LoginRedirectState = {};
  const from = value.from;
  if (typeof from === 'object' && from !== null) {
    const f = from as Record<string, unknown>;
    if (typeof f.pathname === 'string') {
      result.from = {
        pathname: f.pathname,
        search: typeof f.search === 'string' ? f.search : '',
        hash: typeof f.hash === 'string' ? f.hash : '',
      };
    }
  }
  if (value.expired === true) result.expired = true;
  return result;
}

function SessionGate({ children }: { children: ReactNode }) {
  const { state, retryRestore } = useAuth();
  if (state.status === 'checking') {
    return <FullScreenMessage title="Leyendo el Log Pose…" subtitle="Verificando tu sesión" spinner />;
  }
  if (state.status === 'restore-error') {
    return (
      <FullScreenMessage title="No pudimos verificar tu sesión">
        <ErrorState error={state.error} onRetry={retryRestore} />
      </FullScreenMessage>
    );
  }
  return <>{children}</>;
}

// Rutas privadas: sin sesión van al login recordando la ubicación exacta (ruta + query + hash).
export function RequireAuth() {
  const { state } = useAuth();
  const location: Location = useLocation();
  if (state.status === 'anonymous') {
    const redirect: LoginRedirectState = {
      from: { pathname: location.pathname, search: location.search, hash: location.hash },
      expired: state.expired,
    };
    return <Navigate to="/login" replace state={redirect} />;
  }
  return (
    <SessionGate>
      <Outlet />
    </SessionGate>
  );
}

// Login y registro: con sesión iniciada se vuelve a donde el usuario quería ir.
export function PublicOnly() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'authenticated') {
    const { from } = readLoginState(location.state);
    const target = from ? `${from.pathname}${from.search}${from.hash}` : '/';
    return <Navigate to={target} replace />;
  }
  return (
    <SessionGate>
      <Outlet />
    </SessionGate>
  );
}
