"use client"

const SEPARATOR = "   ·   "

export default function TickerTrack({ messages }: { messages: string[] }) {
  const track = messages.join(SEPARATOR) + SEPARATOR

  return (
    <div
      className="ticker-bar relative overflow-hidden py-2 text-xs font-semibold"
      style={{
        background:
          "linear-gradient(90deg, var(--coral-dim) 0%, #7c1fa8 35%, var(--teal-dim) 70%, var(--coral-dim) 100%)",
        color: "#ffffff",
      }}
    >
      {/* Fade edges */}
      <div
        className="pointer-events-none absolute inset-y-0 w-16 z-10"
        style={{
          background: "linear-gradient(to right, var(--coral-dim), transparent)",
          insetInlineStart: 0,
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-16 z-10"
        style={{
          background: "linear-gradient(to left, var(--coral-dim), transparent)",
          insetInlineEnd: 0,
        }}
      />

      {/* Scrolling track — duplicated for seamless loop */}
      <div className="ticker-track flex whitespace-nowrap">
        <span className="ticker-content inline-block" style={{ paddingInlineEnd: "2rem" }}>
          {track}
        </span>
        <span
          className="ticker-content inline-block"
          style={{ paddingInlineEnd: "2rem" }}
          aria-hidden="true"
        >
          {track}
        </span>
      </div>

      {/* Accessible static version */}
      <span className="sr-only">{messages.join(" · ")}</span>
    </div>
  )
}
