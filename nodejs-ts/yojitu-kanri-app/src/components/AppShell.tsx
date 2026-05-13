import { Link, Outlet } from '@tanstack/react-router'
import { AppContextProvider, useAppContext } from '../context/AppContext'

function ShellContent() {
  const { userId, setUserId, currentUser, masters } = useAppContext()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">予</span>
          <div>
            <strong>予実管理</strong>
            <small>SaaS & IT Cost Ops</small>
          </div>
        </div>
        <nav>
          <Link to="/">ダッシュボード</Link>
          <Link to="/contracts">契約台帳</Link>
          <Link to="/analysis">予実分析</Link>
          <Link to="/usage">従量課金</Link>
          <Link to="/import">CSV取り込み</Link>
          <Link to="/permissions">権限管理</Link>
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">2026年度 / プロトタイプ</p>
            <h1>ITツールの契約・予実・利用量を一元管理</h1>
          </div>
          <label className="role-switcher">
            操作ユーザー
            <select value={userId} onChange={(event) => setUserId(Number(event.target.value))}>
              {(masters?.users ?? []).map((user) => (
                <option value={user.id} key={user.id}>
                  {user.name} / {user.roleName}
                </option>
              ))}
            </select>
          </label>
        </header>
        {currentUser ? (
          <div className="permission-banner">
            <strong>{currentUser.roleName}</strong>
            <span>{currentUser.departmentName ?? '全社'} の権限で表示中</span>
            <span>
              契約 {currentUser.canEditContracts ? '編集可' : '閲覧のみ'} / 予実{' '}
              {currentUser.canEditFinance ? '編集可' : '閲覧のみ'} / 利用量{' '}
              {currentUser.canEditUsage ? '編集可' : '閲覧のみ'}
            </span>
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}

export function AppShell() {
  return (
    <AppContextProvider>
      <ShellContent />
    </AppContextProvider>
  )
}
