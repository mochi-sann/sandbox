import { createLazyFileRoute } from '@tanstack/react-router'
import { AlertsPage } from '../pages/AlertsPage'

export const Route = createLazyFileRoute('/alerts')({
  component: AlertsPage,
})
