import { Outlet, ScrollRestoration, createBrowserRouter } from 'react-router';
import { PublicOnly, RequireAuth } from './auth/guards';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import NewsDetailModal from './pages/news/NewsDetailModal';
import NewsFeedPage from './pages/news/NewsFeedPage';
import SagaStoryPage from './pages/sagas/SagaStoryPage';
import SagasPage from './pages/sagas/SagasPage';
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
              {
                path: '/news',
                element: <NewsFeedPage />,
                // El detalle es una ruta hija: se abre encima del feed, que sigue montado.
                children: [{ path: ':id', element: <NewsDetailModal /> }],
              },
              { path: '/sagas', element: <SagasPage /> },
              { path: '/sagas/:id', element: <SagaStoryPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
