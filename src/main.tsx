import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import Loader from './components/ui/loader/Loader.tsx';

// Lazy loaded views
const Playlist = lazy(() => import('./views/playlist/Playlist.tsx'));
const Saved = lazy(() => import('./views/saved/Saved.tsx')); 
const History = lazy(() => import('./views/history/History.tsx')); 
const Settings = lazy(() => import('./views/settings/Settings.tsx')); 
const ServicePlanner = lazy(() => import('./views/service-planner/ServicePlanner.tsx'));
const SermonNotes = lazy(() => import('./views/sermon-notes/SermonNotes.tsx'));
const VolunteerScheduling = lazy(() => import('./views/volunteer-scheduling/VolunteerScheduling.tsx'));
const AttendanceTracking = lazy(() => import('./views/attendance-tracking/AttendanceTracking.tsx'));
const OfferingRecords = lazy(() => import('./views/offering-records/OfferingRecords.tsx'));
const MemberDirectory = lazy(() => import('./views/member-directory/MemberDirectory.tsx'));
const AnnouncementManager = lazy(() => import('./views/announcement-manager/AnnouncementManager.tsx'));
const CalendarPlanning = lazy(() => import('./views/calendar-planning/CalendarPlanning.tsx'));

// EasyWorship Components
const EasyWorshipController = lazy(() => import('./views/easyworship/EasyWorshipController.tsx'));
const EasyWorshipView = lazy(() => import('./views/projector/EasyWorshipView.tsx'));

// 🔥 GI-AYO ANG IMPORT PATH SA PPTPRESENTATION (Kung gi-change ang folder name)
// 🔥 UG GI-IMPORT ANG BAG-ONG PPTVIEWER 🔥
const Pptpresenatation = lazy(() => import('./views/ppt/Pptpresenatation.tsx'));
const PptViewer = lazy(() => import('./views/ppt/ppt-presentation/PptViewer.tsx'));


const routes = [
  {
    path: '/',
    element: <Navigate to="/app/playlist" replace />,
  },
  {
    path: '/app',
    element: <App />, // Layout with Sidebar
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
        path: 'playlist/:folderId', 
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
        path: 'service-planner',
        element: (
          <Suspense fallback={<Loader />}>
            <ServicePlanner />
          </Suspense>
        )
      },
      {
        path: 'sermon-notes',
        element: (
          <Suspense fallback={<Loader />}>
            <SermonNotes />
          </Suspense>
        )
      },
      {
        path: 'volunteer-scheduling',
        element: (
          <Suspense fallback={<Loader />}>
            <VolunteerScheduling />
          </Suspense>
        )
      },
      {
        path: 'attendance-tracking',
        element: (
          <Suspense fallback={<Loader />}>
            <AttendanceTracking />
          </Suspense>
        )
      },
      {
        path: 'offering-records',
        element: (
          <Suspense fallback={<Loader />}>
            <OfferingRecords />
          </Suspense>
        )
      },
      {
        path: 'member-directory',
        element: (
          <Suspense fallback={<Loader />}>
            <MemberDirectory />
          </Suspense>
        )
      },
      {
        path: 'announcement-manager',
        element: (
          <Suspense fallback={<Loader />}>
            <AnnouncementManager />
          </Suspense>
        )
      },
      {
        path: 'calendar-planning',
        element: (
          <Suspense fallback={<Loader />}>
            <CalendarPlanning />
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
      },
      {
        path: 'easyworship', // Ang Controller (naay sidebar)
        element: (
          <Suspense fallback={<Loader />}>
            <EasyWorshipController />
          </Suspense>
        )
      },
      // 🔥 BAG-ONG MGA ROUTES PARA SA PPT PRESENTATION 🔥
      {
        path: 'ppt-presentation', // Parent route for the list
        element: (
          <Suspense fallback={<Loader />}>
            <Pptpresenatation />
          </Suspense>
        )
      },
      {
        path: 'ppt-presentation/:id', // Route for the individual viewer
        element: (
          <Suspense fallback={<Loader />}>
            <PptViewer />
          </Suspense>
        )
      },
    ]
  },
  
  // --- EXTERNAL OUTPUT (Gawas sa /app para PURE BLACK SCREEN ra jud ni) ---
  {
    path: '/projector',
    element: (
      <Suspense fallback={<Loader />}>
        <EasyWorshipView />
      </Suspense>
    )
  },
  {
    path: '/obs-lyrics',
    element: (
      <Suspense fallback={<Loader />}>
        <EasyWorshipView />
      </Suspense>
    )
  },

  // --- 404 CATCH ALL ---
  {
    path: '*',
    element: <div className="text-white p-10 h-screen bg-zinc-950 flex items-center justify-center">404 - Page Not Found</div>,
  },
];

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
