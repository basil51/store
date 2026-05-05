import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { revalidateStorefrontCatalog } from "../shared/revalidate-storefront-catalog"

export default async function catalogProductRevalidationSubscriber(
  {}: SubscriberArgs<{ id: string }>
) {
  try {
    await revalidateStorefrontCatalog(["products"])
  } catch (error) {
    console.error("Failed to revalidate storefront product catalog cache.", error)
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated", "product.deleted"],
  context: {
    subscriberId: "storefront-catalog-product-revalidation",
  },
}