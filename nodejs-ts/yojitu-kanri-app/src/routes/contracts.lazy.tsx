import { createLazyFileRoute } from '@tanstack/react-router'
import { ContractsPage } from '../pages/ContractsPage'

export const Route = createLazyFileRoute('/contracts')({
  component: ContractsPage,
})
