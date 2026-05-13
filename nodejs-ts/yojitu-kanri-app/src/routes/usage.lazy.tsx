import { createLazyFileRoute } from '@tanstack/react-router'
import { UsagePage } from '../pages/UsagePage'

export const Route = createLazyFileRoute('/usage')({
  component: UsagePage,
})
