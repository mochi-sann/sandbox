import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { AppShell } from './components/AppShell'
import { AnalysisPage } from './pages/AnalysisPage'
import { ContractsPage } from './pages/ContractsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ImportPage } from './pages/ImportPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { UsagePage } from './pages/UsagePage'
import './App.css'

const rootRoute = createRootRoute({ component: AppShell })

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: DashboardPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/contracts',
    component: ContractsPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/analysis',
    component: AnalysisPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/usage',
    component: UsagePage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/import',
    component: ImportPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/permissions',
    component: PermissionsPage,
  }),
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return <RouterProvider router={router} />
}

export default App
