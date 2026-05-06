"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { ensureTrustedServerActionRequest } from "@lib/util/trusted-origin"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"
import { HttpTypes } from "@medusajs/types"
import { getOrdersCacheOptions } from "./orders-cache"

const ORDER_DETAIL_FIELDS = [
  "*",
  "*payment_collections",
  "*payment_collections.payments",
  "*items",
  "+items.metadata",
  "*items.variant",
  "*items.product",
  "*shipping_methods",
].join(",")

const ORDER_LIST_FALLBACK_LIMIT = 100

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getOrdersCacheOptions()),
  }

  try {
    const { order } = await sdk.client.fetch<HttpTypes.StoreOrderResponse>(
      `/store/orders/${id}`,
      {
        method: "GET",
        query: {
          fields: ORDER_DETAIL_FIELDS,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )

    return order
  } catch (error) {
    const fallbackOrder = await sdk.client
      .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
        method: "GET",
        query: {
          limit: ORDER_LIST_FALLBACK_LIMIT,
          order: "-created_at",
          fields: ORDER_DETAIL_FIELDS,
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ orders }) => orders.find((order) => order.id === id) ?? null)
      .catch(() => null)

    if (fallbackOrder) {
      return fallbackOrder
    }

    return medusaError(error)
  }
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, any>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getOrdersCacheOptions()),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields: "*items,+items.metadata,*items.variant,*items.product",
        ...filters,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  await ensureTrustedServerActionRequest()

  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(async ({ order }) => {
      const ordersCacheTag = await getCacheTag("orders")
      if (ordersCacheTag) {
        revalidateTag(ordersCacheTag)
      }

      return { success: true, error: null, order }
    })
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  await ensureTrustedServerActionRequest()

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(async ({ order }) => {
      const ordersCacheTag = await getCacheTag("orders")
      if (ordersCacheTag) {
        revalidateTag(ordersCacheTag)
      }

      return { success: true, error: null, order }
    })
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  await ensureTrustedServerActionRequest()

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(async ({ order }) => {
      const ordersCacheTag = await getCacheTag("orders")
      if (ordersCacheTag) {
        revalidateTag(ordersCacheTag)
      }

      return { success: true, error: null, order }
    })
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
