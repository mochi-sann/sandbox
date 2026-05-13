import { createLazyFileRoute } from '@tanstack/react-router'
import { PermissionsPage } from '../pages/PermissionsPage'

export const Route = createLazyFileRoute('/permissions')({
  component: PermissionsPage,
})
