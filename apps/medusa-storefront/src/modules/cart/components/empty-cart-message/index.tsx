import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 rounded-2xl px-8 py-24 text-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      data-testid="empty-cart-message"
    >
      <span className="text-6xl" aria-hidden>
        🛒
      </span>
      <div>
        <h1
          className="font-syne text-3xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Your cart is empty
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-7" style={{ color: "var(--text-dim)" }}>
          Looks like you haven&apos;t added anything yet. Start browsing and
          find something you&apos;ll love.
        </p>
      </div>
      <LocalizedClientLink href="/store" className="btn-primary px-8">
        Explore products →
      </LocalizedClientLink>
    </div>
  )
}

export default EmptyCartMessage
