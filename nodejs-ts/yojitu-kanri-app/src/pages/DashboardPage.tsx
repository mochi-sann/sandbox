import { api } from '../api'
import { LoadingState } from '../components/LoadingState'
import { useAppContext } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { yen } from '../lib/format'
import type { Dashboard } from '../../shared/types'

export function DashboardPage() {
  const { userId } = useAppContext()
  const { data, error, loading } = useAsync<Dashboard>(() => api.dashboard({ userId }), [userId])
  if (loading || error || !data) return <LoadingState loading={loading} error={error} />

  const cards = [
    ['年間予算', yen.format(data.annualBudget)],
    ['累計実績', yen.format(data.actualTotal)],
    ['予算消化率', `${data.budgetUsageRate}%`],
    ['予算超過見込み', yen.format(data.overrunForecast)],
    ['90日以内の更新', `${data.renewalWithin90Days}件`],
    ['削減候補', yen.format(data.reductionCandidate)],
    ['従量課金見込み', yen.format(data.usageForecast)],
    ['利用量急増', `${data.usageSpikeCount}件`],
  ]

  return (
    <section className="page-grid">
      <div className="kpi-grid">
        {cards.map(([label, value]) => (
          <article className="kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="panel">
        <h2>今月の重点確認</h2>
        <div className="stacked-bars">
          <div>
            <span>予算消化</span>
            <progress max="100" value={Math.min(data.budgetUsageRate, 100)} />
          </div>
          <div>
            <span>従量課金アラート</span>
            <progress max="10" value={Math.min(data.usageSpikeCount, 10)} />
          </div>
        </div>
      </section>
    </section>
  )
}
