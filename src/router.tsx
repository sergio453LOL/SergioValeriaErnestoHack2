import { Outlet, ScrollRestoration, createBrowserRouter } from 'react-router';
import { PublicOnly, RequireAuth } from './auth/guards';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import WantedDetailPage from './pages/wanted/WantedDetailPage';
import WantedListPage from './pages/wanted/WantedListPage';

function RootLayout() {
  return (
    <>
      <Outlet />
      {/* Restaura el scroll al usar atrás/adelante (p. ej. al volver del detalle de un cartel) */}
      <ScrollRestoration />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/wanted', element: <WantedListPage /> },
              { path: '/wanted/:id', element: <WantedDetailPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
