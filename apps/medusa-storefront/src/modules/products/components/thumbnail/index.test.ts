import { describe, expect, it } from "vitest"

import {
  getThumbnailImageSizes,
  PRODUCT_CARD_IMAGE_SIZES,
} from "./index"

describe("thumbnail image sizing", () => {
  it("keeps compact square thumbnails small by default", () => {
    expect(getThumbnailImageSizes("square")).toBe("120px")
  })

  it("uses responsive card sizing for product listing cards", () => {
    expect(PRODUCT_CARD_IMAGE_SIZES).toContain("280px")
    expect(PRODUCT_CARD_IMAGE_SIZES).toContain("calc((100vw - 4rem) / 3)")
  })

  it("keeps large non-card thumbnails bounded", () => {
    expect(getThumbnailImageSizes("large")).toBe(
      "(max-width: 768px) 90vw, 440px"
    )
  })
})
