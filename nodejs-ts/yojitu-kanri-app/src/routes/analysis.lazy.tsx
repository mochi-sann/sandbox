import { createLazyFileRoute } from '@tanstack/react-router'
import { AnalysisPage } from '../pages/AnalysisPage'

export const Route = createLazyFileRoute('/analysis')({
  component: AnalysisPage,
})
