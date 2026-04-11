import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import Loader from './components/ui/loader/Loader.tsx';
// Lazy loaded views
const Playlist = lazy(() => import('./views/playlist/Playlist.tsx'));
const Saved = lazy(() => import('./views/saved/Saved.tsx')); // Create this file
const History = lazy(() => import('./views/history/History.tsx')); // Create this file
const Settings = lazy(() => import('./views/settings/Settings.tsx')); // Create this file

const routes = [
  {
    path: '/',
    element: <Navigate to="/app/playlist" replace />,
  },
  {
    path: '/app',
    element: <App />, // This acts as the Layout
    children: [
      {
        path: 'playlist',
        element: (
          <Suspense fallback={<Loader />}>
            <Playlist />
          </Suspense>
        )
      },
      {
        path: 'saved',
        element: (
          <Suspense fallback={<Loader />}>
            <Saved />
          </Suspense>
        )
      },
      {
        path: 'history',
        element: (
          <Suspense fallback={<Loader />}>
            <History />
          </Suspense>
        )
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<Loader />}>
            <Settings />
          </Suspense>
        )
      }
    ]
  },
  {
    path: '*',
    element: <div className="text-white p-10">404 - Page Not Found</div>,
  },
];

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Fixed: Only one RouterProvider is needed */}
    <RouterProvider router={router} />
  </StrictMode>,
)