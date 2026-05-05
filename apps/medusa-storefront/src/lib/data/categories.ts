import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCatalogCacheOptions } from "./catalog-cache"

export const CATEGORY_FIELDS =
  "id,name,description,handle,rank,parent_category_id,metadata,*category_children,*parent_category,*parent_category.parent_category"

export const listCategories = async (query?: Record<string, any>) => {
  const next = {
    ...(await getCatalogCacheOptions("categories")),
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields: CATEGORY_FIELDS,
          limit,
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCatalogCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: CATEGORY_FIELDS,
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
