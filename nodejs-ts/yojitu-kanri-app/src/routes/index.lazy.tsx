import { createLazyFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '../pages/DashboardPage'

export const Route = createLazyFileRoute('/')({
  component: DashboardPage,
})
