import { HttpTypes } from "@medusajs/types"

export type GroupedLineItems = {
  presetKey: string
  presetTitle: string
  presetBadge?: string
  presetIsDefault?: boolean
  items: HttpTypes.StoreCartLineItem[]
  totalQuantity: number
  totalPrice: number
}

export const groupLineItemsByPreset = (
  items: HttpTypes.StoreCartLineItem[]
): GroupedLineItems[] => {
  const grouped = new Map<
    string,
    {
      presetKey: string
      presetTitle: string
      presetBadge?: string
      presetIsDefault?: boolean
      items: HttpTypes.StoreCartLineItem[]
    }
  >()

  const ungroupedItems: HttpTypes.StoreCartLineItem[] = []

  for (const item of items) {
    const metadata = item.metadata as Record<string, unknown> | null

    const presetKey = metadata?.variant_combination_key as string | undefined
    const presetTitle = metadata?.variant_combination_title as string | undefined
    const presetBadge = metadata?.variant_combination_badge as string | undefined
    const presetIsDefault = metadata?.variant_combination_is_default as boolean | undefined

    if (presetKey && presetTitle) {
      const groupKey = presetKey
      const existing = grouped.get(groupKey)

      if (existing) {
        existing.items.push(item)
      } else {
        grouped.set(groupKey, {
          presetKey,
          presetTitle,
          presetBadge,
          presetIsDefault,
          items: [item],
        })
      }
    } else {
      ungroupedItems.push(item)
    }
  }

  const result: GroupedLineItems[] = Array.from(grouped.values()).map(
    (group) => ({
      ...group,
      totalQuantity: group.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
      totalPrice:
        group.items.reduce((sum, item) => {
          const lineTotal = item.totals?.original ?? 0
          return sum + lineTotal
        }, 0) / 100, // Convert from cents
    })
  )

  // Add ungrouped items as individual "groups" (no preset)
  for (const item of ungroupedItems) {
    result.push({
      presetKey: `ungrouped-${item.id}`,
      presetTitle: "Individual item",
      items: [item],
      totalQuantity: item.quantity ?? 0,
      totalPrice: (item.totals?.original ?? 0) / 100,
    })
  }

  return result
}

export const shouldDisplayPresetGrouping = (
  items: HttpTypes.StoreCartLineItem[] | undefined
): boolean => {
  if (!items || items.length === 0) {
    return false
  }

  // Show grouping if at least 2 items have preset metadata
  const itemsWithPreset = items.filter((item) => {
    const metadata = item.metadata as Record<string, unknown> | null
    return !!(metadata?.variant_combination_key && metadata?.variant_combination_title)
  })

  return itemsWithPreset.length >= 2
}
