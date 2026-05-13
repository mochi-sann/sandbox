import { createLazyFileRoute } from '@tanstack/react-router'
import { ImportPage } from '../pages/ImportPage'

export const Route = createLazyFileRoute('/import')({
  component: ImportPage,
})
