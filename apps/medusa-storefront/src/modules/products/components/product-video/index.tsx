"use client"

import { HttpTypes } from "@medusajs/types"
import { useState } from "react"

type ProductVideoProps = {
  product: HttpTypes.StoreProduct
}

function parseVideoUrl(raw: string): { type: "youtube" | "vimeo" | "direct"; src: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // YouTube: watch?v=, youtu.be/, shorts/
  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/) ??
    trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)
  if (ytMatch) {
    return { type: "youtube", src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1` }
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) {
    return { type: "vimeo", src: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0` }
  }

  // Direct video file
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed) || trimmed.startsWith("blob:")) {
    return { type: "direct", src: trimmed }
  }

  return null
}

const ProductVideo = ({ product }: ProductVideoProps) => {
  const [playing, setPlaying] = useState(false)

  const raw = product.metadata?.video_url
  if (typeof raw !== "string" || !raw.trim()) return null

  const parsed = parseVideoUrl(raw)
  if (!parsed) return null

  return (
    <div className="mt-3 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)" }}>
      {parsed.type === "direct" ? (
        // Native <video> for hosted files
        <video
          src={parsed.src}
          controls
          playsInline
          className="w-full rounded-2xl"
          style={{ background: "var(--surface2)", display: "block" }}
          preload="metadata"
        />
      ) : (
        // Embed for YouTube / Vimeo — lazy: show poster until user clicks play
        playing ? (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`${parsed.src}&autoplay=1`}
              title="Product video"
              className="absolute inset-0 h-full w-full rounded-2xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <button
            onClick={() => setPlaying(true)}
            aria-label="Play product video"
            className="group relative w-full overflow-hidden rounded-2xl"
            style={{ paddingBottom: "56.25%", background: "var(--surface2)", display: "block" }}
          >
            {/* Thumbnail via YouTube's public API — graceful fallback bg if it fails */}
            {parsed.type === "youtube" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://img.youtube.com/vi/${new URL(parsed.src).pathname.split("/")[2]}/hqdefault.jpg`}
                alt="Video thumbnail"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Play button overlay */}
            <span
              className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-90"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, var(--teal), var(--teal-dim))",
                  boxShadow: "var(--glow-teal)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="white"
                  style={{ marginLeft: "3px" }}
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )
      )}
    </div>
  )
}

export default ProductVideo
