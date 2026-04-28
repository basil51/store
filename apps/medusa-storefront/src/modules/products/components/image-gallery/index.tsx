"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy } from "@lib/ui-copy"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const locale = useUiLocale()
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const t = (
    key: Parameters<typeof getUiCopy>[1],
    params?: Record<string, string | number>
  ) => getUiCopy(locale, key, params)

  const validImages = images.filter((img) => !!img.url)

  const prev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + validImages.length) % validImages.length)
  }, [validImages.length])

  const next = useCallback(() => {
    setActiveIndex((i) => (i + 1) % validImages.length)
  }, [validImages.length])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev()
      else if (e.key === "ArrowRight") next()
      else if (e.key === "Escape") setLightboxOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxOpen, prev, next])

  if (!validImages.length) return null

  const active = validImages[activeIndex]

  return (
    <>
      {/* Main gallery */}
      <div className="flex flex-col gap-3">
        {/* Large active image */}
        <div
          className="relative w-full cursor-zoom-in overflow-hidden rounded-2xl"
          style={{
            aspectRatio: "1 / 1",
            background:
              "radial-gradient(circle at top right, rgba(0,229,200,0.08), transparent 55%), var(--surface2)",
            border: "1px solid var(--border)",
          }}
          onClick={() => setLightboxOpen(true)}
          role="button"
          aria-label={t("imageGalleryZoomImageAria")}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setLightboxOpen(true)}
        >
          <Image
            src={active.url!}
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 rounded-2xl object-cover transition-opacity duration-300"
            alt={t("imageGalleryProductImageAlt", { index: activeIndex + 1 })}
            fill
            sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 640px"
          />
          {/* Zoom hint */}
          <span
            className="absolute bottom-3 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
            style={{
              background: "rgba(0,0,0,0.45)",
              color: "var(--text-muted)",
              backdropFilter: "blur(6px)",
              insetInlineEnd: "0.75rem",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
            </svg>
            {t("imageGalleryClickToZoom")}
          </span>
        </div>

        {/* Thumbnails */}
        {validImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {validImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setActiveIndex(index)}
                aria-label={`View image ${index + 1}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl transition-all duration-200"
                style={{
                  border: `2px solid ${index === activeIndex ? "var(--teal)" : "var(--border)"}`,
                  background: "var(--surface2)",
                  boxShadow: index === activeIndex ? "var(--glow-teal)" : "none",
                  opacity: index === activeIndex ? 1 : 0.6,
                }}
              >
                <Image
                  src={image.url!}
                  alt={t("imageGalleryThumbnailAlt", { index: index + 1 })}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Image container */}
          <div
            className="relative mx-4 max-h-[90vh] max-w-[90vw]"
            style={{ aspectRatio: "1 / 1", width: "min(90vw, 90vh)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={active.url!}
              alt={t("imageGalleryProductImageAlt", { index: activeIndex + 1 })}
              fill
              className="rounded-2xl object-contain"
              sizes="90vw"
            />
          </div>

          {/* Close */}
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label={t("imageGalleryCloseAria")}
            className="absolute top-4 flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "var(--text)",
              insetInlineEnd: "1rem",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Prev / Next arrows */}
          {validImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                aria-label={t("imageGalleryPreviousAria")}
                className="absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "var(--text)",
                  insetInlineStart: "1rem",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                aria-label={t("imageGalleryNextAria")}
                className="absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "var(--text)",
                  insetInlineEnd: "4rem",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
            <div
              className="rounded-full px-3 py-1 text-sm"
              style={{ background: "rgba(0,0,0,0.5)", color: "var(--text-muted)" }}
            >
              {activeIndex + 1} / {validImages.length}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ImageGallery
