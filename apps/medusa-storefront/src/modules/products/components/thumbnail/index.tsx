import { clx } from "@medusajs/ui"
import Image from "next/image"
import React from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  // TODO: Fix image typings
  images?: any[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  loading?: "lazy" | "eager"
  sizes?: string
  className?: string
  "data-testid"?: string
}

export const PRODUCT_CARD_IMAGE_SIZES =
  "(max-width: 576px) calc(100vw - 2rem), (max-width: 768px) calc((100vw - 3rem) / 2), (max-width: 1024px) calc((100vw - 4rem) / 3), 280px"

export const getThumbnailImageSizes = (size: ThumbnailProps["size"]) => {
  switch (size) {
    case "small":
      return "180px"
    case "medium":
      return "(max-width: 576px) 90vw, 290px"
    case "large":
      return "(max-width: 768px) 90vw, 440px"
    case "full":
      return "(max-width: 576px) 100vw, 360px"
    case "square":
    default:
      return "120px"
  }
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  loading = "lazy",
  sizes,
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url
  const cssVarBg = "[background:var(--surface2)]"

  return (
    <div
      className={clx(
        "relative overflow-hidden",
        cssVarBg,
        className,
        {
          "aspect-[11/14]": isFeatured,
          "aspect-[9/16]": !isFeatured && size !== "square",
          "aspect-[1/1]": size === "square",
          "w-full": size === "square" || size === "full",
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder
        image={initialImage}
        size={size}
        loading={loading}
        sizes={sizes}
      />
    </div>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
  loading,
  sizes,
}: Pick<ThumbnailProps, "size" | "loading" | "sizes"> & { image?: string }) => {
  const dimensions =
    size === "square" ? { width: 1200, height: 1200 } : { width: 900, height: 1600 }

  return image ? (
    <Image
      src={image}
      alt="Thumbnail"
      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.05]"
      draggable={false}
      quality={60}
      loading={loading}
      fetchPriority={loading === "eager" ? "high" : "auto"}
      sizes={sizes ?? getThumbnailImageSizes(size)}
      width={dimensions.width}
      height={dimensions.height}
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--surface2)" }}>
      <PlaceholderImage size={size === "small" ? 16 : 24} />
    </div>
  )
}

export default Thumbnail
