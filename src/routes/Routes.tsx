import { createHashRouter, RouterProvider, Outlet } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { HomePage } from '../pages/HomePage';
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
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
