import { createFileRoute } from '@tanstack/react-router'
import { ContractsPage } from '../pages/ContractsPage'

export const Route = createFileRoute('/contracts')({
  component: ContractsPage,
})
