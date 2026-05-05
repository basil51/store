import { normalizeRecommendationAnalyticsEvent } from "../../shared/recommendation-analytics"

describe("recommendation analytics normalization", () => {
  it("normalizes accepted rail view events", () => {
    const result = normalizeRecommendationAnalyticsEvent({
      event_name: "recommendation_rail_viewed",
      payload: {
        rail: "related_products",
        source_product_id: "prod_source",
        recommended_count: 4,
        locale: "en",
      },
    })

    expect("value" in result).toBe(true)

    if ("value" in result) {
      expect(result.value.rail).toBe("related_products")
      expect(result.value.sourceProductId).toBe("prod_source")
      expect(result.value.recommendedCount).toBe(4)
    }
  })

  it("requires clicked product fields for click events", () => {
    expect(
      normalizeRecommendationAnalyticsEvent({
        event_name: "recommendation_product_clicked",
        payload: {
          rail: "related_products",
          source_product_id: "prod_source",
          recommended_count: 4,
        },
      })
    ).toEqual({
      error:
        "payload.recommended_product_id is required for recommendation_product_clicked.",
    })
  })

  it("rejects invalid recommendation slots", () => {
    expect(
      normalizeRecommendationAnalyticsEvent({
        event_name: "recommendation_product_clicked",
        payload: {
          rail: "related_products",
          source_product_id: "prod_source",
          recommended_count: 4,
          recommended_product_id: "prod_target",
          recommendation_slot: 0,
        },
      })
    ).toEqual({
      error: "payload.recommendation_slot must be greater than zero when provided.",
    })
  })
})