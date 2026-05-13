import { createFileRoute } from '@tanstack/react-router'
import { PermissionsPage } from '../pages/PermissionsPage'

export const Route = createFileRoute('/permissions')({
  component: PermissionsPage,
})
