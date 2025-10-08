import { PaginationMeta } from "../types"

interface TaskPaginationProps {
  meta: PaginationMeta | null
  onPageChange: (page: number) => void
  disabled: boolean
}

export const TaskPagination = ({ meta, onPageChange, disabled }: TaskPaginationProps) => {
  if (!meta || meta.totalPages <= 1) {
    return null
  }

  const pages: number[] = []
  const start = Math.max(1, meta.page - 2)
  const end = Math.min(meta.totalPages, meta.page + 2)

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return (
    <nav aria-label="タスク一覧ページネーション" className="mt-3">
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${meta.page === 1 ? "disabled" : ""}`}>
          <button
            className="page-link"
            type="button"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={disabled || meta.page === 1}
          >
            前へ
          </button>
        </li>

        {start > 1 && (
          <li className="page-item">
            <button className="page-link" type="button" onClick={() => onPageChange(1)} disabled={disabled}>
              1
            </button>
          </li>
        )}

        {start > 2 && <li className="page-item disabled"><span className="page-link">…</span></li>}

        {pages.map((pageNumber) => (
          <li key={pageNumber} className={`page-item ${meta.page === pageNumber ? "active" : ""}`}>
            <button
              className="page-link"
              type="button"
              onClick={() => onPageChange(pageNumber)}
              disabled={disabled || meta.page === pageNumber}
            >
              {pageNumber}
            </button>
          </li>
        ))}

        {end < meta.totalPages - 1 && <li className="page-item disabled"><span className="page-link">…</span></li>}

        {end < meta.totalPages && (
          <li className="page-item">
            <button
              className="page-link"
              type="button"
              onClick={() => onPageChange(meta.totalPages)}
              disabled={disabled}
            >
              {meta.totalPages}
            </button>
          </li>
        )}

        <li className={`page-item ${meta.page === meta.totalPages ? "disabled" : ""}`}>
          <button
            className="page-link"
            type="button"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={disabled || meta.page === meta.totalPages}
          >
            次へ
          </button>
        </li>
      </ul>
    </nav>
  )
}
