import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { revalidateStorefrontCatalog } from "../shared/revalidate-storefront-catalog"

export default async function catalogTranslationRevalidationSubscriber(
  {}: SubscriberArgs<{ id: string }>
) {
  try {
    await revalidateStorefrontCatalog(["products", "categories", "collections"])
  } catch (error) {
    console.error("Failed to revalidate storefront translation-driven catalog cache.", error)
  }
}

export const config: SubscriberConfig = {
  event: ["translation.created", "translation.updated", "translation.deleted"],
  context: {
    subscriberId: "storefront-catalog-translation-revalidation",
  },
}