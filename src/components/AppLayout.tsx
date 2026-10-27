import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';

function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-sea-800 text-gold' : 'text-slate-300 hover:bg-sea-900 hover:text-slate-100'
  }`;
}

export default function AppLayout() {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const team = state.status === 'authenticated' ? state.team : null;

  function handleLogout() {
    navigate('/login', { replace: true });
    logout();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-sea-800 bg-sea-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="font-display text-lg text-gold">⚓ Log Pose Console</span>
          <nav className="flex gap-1" aria-label="Principal">
            <NavLink to="/" end className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/wanted" className={navClass}>
              Se Busca
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {team && (
              <span className="text-right text-xs leading-tight text-slate-400">
                <span className="block text-sm text-slate-200">{team.name}</span>
                <span className="font-mono">{team.code}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-sea-700 px-3 py-2 text-sm text-slate-200 hover:border-coral hover:text-coral"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
