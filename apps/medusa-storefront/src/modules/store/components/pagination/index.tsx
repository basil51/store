"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function Pagination({
  page,
  totalPages,
  'data-testid': dataTestid
}: {
  page: number
  totalPages: number
  'data-testid'?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const arrayRange = (start: number, stop: number) =>
    Array.from({ length: stop - start + 1 }, (_, i) => start + i)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const PageBtn = ({
    p,
    label,
    isCurrent,
  }: {
    p: number
    label: string | number
    isCurrent: boolean
  }) => (
    <button
      key={p}
      disabled={isCurrent}
      onClick={() => handlePageChange(p)}
      className="flex h-9 min-w-[36px] items-center justify-center rounded-xl px-3 text-sm font-semibold transition-all duration-150"
      style={
        isCurrent
          ? { background: "var(--teal)", color: "#000", cursor: "default" }
          : {
              background: "var(--surface2)",
              color: "var(--text-dim)",
              border: "1px solid var(--border)",
            }
      }
    >
      {label}
    </button>
  )

  const Ellipsis = ({ k }: { k: string }) => (
    <span
      key={k}
      className="flex h-9 items-center px-1 text-sm"
      style={{ color: "var(--text-dim)" }}
    >
      …
    </span>
  )

  const renderPageButtons = () => {
    const buttons: React.ReactNode[] = []

    if (totalPages <= 7) {
      buttons.push(
        ...arrayRange(1, totalPages).map((p) => (
          <PageBtn key={p} p={p} label={p} isCurrent={p === page} />
        ))
      )
    } else if (page <= 4) {
      arrayRange(1, 5).forEach((p) =>
        buttons.push(<PageBtn key={p} p={p} label={p} isCurrent={p === page} />)
      )
      buttons.push(<Ellipsis key="e1" k="e1" />)
      buttons.push(
        <PageBtn key={totalPages} p={totalPages} label={totalPages} isCurrent={totalPages === page} />
      )
    } else if (page >= totalPages - 3) {
      buttons.push(<PageBtn key={1} p={1} label={1} isCurrent={1 === page} />)
      buttons.push(<Ellipsis key="e2" k="e2" />)
      arrayRange(totalPages - 4, totalPages).forEach((p) =>
        buttons.push(<PageBtn key={p} p={p} label={p} isCurrent={p === page} />)
      )
    } else {
      buttons.push(<PageBtn key={1} p={1} label={1} isCurrent={1 === page} />)
      buttons.push(<Ellipsis key="e3" k="e3" />)
      arrayRange(page - 1, page + 1).forEach((p) =>
        buttons.push(<PageBtn key={p} p={p} label={p} isCurrent={p === page} />)
      )
      buttons.push(<Ellipsis key="e4" k="e4" />)
      buttons.push(
        <PageBtn key={totalPages} p={totalPages} label={totalPages} isCurrent={totalPages === page} />
      )
    }

    return buttons
  }

  return (
    <div className="mt-10 flex w-full justify-center" data-testid={dataTestid}>
      <div
        className="flex items-center gap-1.5 rounded-2xl p-1.5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Prev */}
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm transition-all"
          style={
            page <= 1
              ? { color: "var(--border)", cursor: "default" }
              : {
                  background: "var(--surface2)",
                  color: "var(--text-dim)",
                  border: "1px solid var(--border)",
                }
          }
          aria-label="Previous page"
        >
          ‹
        </button>

        {renderPageButtons()}

        {/* Next */}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm transition-all"
          style={
            page >= totalPages
              ? { color: "var(--border)", cursor: "default" }
              : {
                  background: "var(--surface2)",
                  color: "var(--text-dim)",
                  border: "1px solid var(--border)",
                }
          }
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  )
}
