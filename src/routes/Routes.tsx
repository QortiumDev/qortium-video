import { createHashRouter, RouterProvider, Outlet } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { HomePage } from '../pages/HomePage';
import { WatchPage } from '../pages/WatchPage';
import { UploadPage } from '../pages/UploadPage';
import { PlaylistsPage } from '../pages/PlaylistsPage';
import { PlaylistDetailPage } from '../pages/PlaylistDetailPage';
import { ChannelPage } from '../pages/ChannelPage';
import { useIframe } from '../hooks/useIframeListener';

const _startRoute = new URLSearchParams(window.location.search).get('_route');
if (_startRoute) window.location.hash = _startRoute;

function Layout() {
  useIframe();
  return (<><TopBar /><Outlet /></>);
}

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'watch/:name/:identifier', element: <WatchPage /> },
      { path: 'upload', element: <UploadPage /> },
      { path: 'playlists', element: <PlaylistsPage /> },
      { path: 'playlist/:name/:identifier', element: <PlaylistDetailPage /> },
      { path: 'channel/:name', element: <ChannelPage /> },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
