// /src/routes/index.tsx
// React Router configuration

// @ts-ignore
import { createBrowserRouter } from 'react-router-dom';
import Layout from '../pages/_layout';
import { Dashboard } from '../pages/Dashboard';
import { DatabaseExplorer } from '../pages/DatabaseExplorer';
import { AccessControl } from '../pages/AccessControl';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/explorer', element: <DatabaseExplorer /> },
      { path: '/access', element: <AccessControl /> }
    ]
  }
]);
