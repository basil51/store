"use client"

import { useToast } from "@lib/context/toast-context"
import { useState } from "react"

export default function WishlistButton({ productId }: { productId: string }) {
  const [liked, setLiked] = useState(false)
  const { toast } = useToast()

  return (
    <button
      aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(e) => {
        e.preventDefault()
        const next = !liked
        setLiked(next)
        toast(next ? "Saved to wishlist" : "Removed from wishlist", "coral")
      }}
      className="absolute top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-all duration-200 group-hover:opacity-100"
      style={{
        background: liked ? "var(--coral)" : "rgba(19,22,31,0.72)",
        border: "1px solid var(--border)",
        backdropFilter: "blur(8px)",
        insetInlineEnd: "0.5rem",
      }}
    >
      <svg
        width="15"
        height="14"
        viewBox="0 0 15 14"
        fill={liked ? "#fff" : "none"}
        stroke={liked ? "#fff" : "var(--text-dim)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7.5 12.5S1.5 8.5 1.5 4.5a3 3 0 0 1 6-0.9A3 3 0 0 1 13.5 4.5c0 4-6 8-6 8z" />
      </svg>
    </button>
  )
}
