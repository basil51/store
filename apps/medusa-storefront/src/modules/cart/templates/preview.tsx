"use client"

import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Table, Text, clx } from "@medusajs/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import {
  groupLineItemsByPreset,
  shouldDisplayPresetGrouping,
} from "@lib/util/cart-grouping"
import type { ProductStockMode } from "@lib/util/stock-mode"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
  grouped?: boolean
  defaultStockMode?: ProductStockMode
}

const ItemsPreviewTemplate = ({
  cart,
  grouped = false,
  defaultStockMode,
}: ItemsTemplateProps) => {
  const items = cart.items
  const hasOverflow = items && items.length > 4
  const displayGrouping = grouped && shouldDisplayPresetGrouping(items)
  const groupedItems = displayGrouping && items ? groupLineItemsByPreset(items) : null

  return (
    <div
      className={clx({
        "overflow-y-scroll overflow-x-hidden no-scrollbar max-h-[420px]":
          hasOverflow,
      })}
      style={hasOverflow ? { paddingInlineStart: "1px" } : undefined}
    >
      <Table>
        <Table.Body data-testid="items-table">
          {items
            ? displayGrouping && groupedItems
              ? groupedItems.map((group) => (
                  <PreviewGroup
                    key={group.presetKey}
                    group={group}
                    currencyCode={cart.currency_code}
                    defaultStockMode={defaultStockMode}
                  />
                ))
              : items
                  .sort((a, b) => {
                    return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                  })
                  .map((item) => {
                    return (
                      <Item
                        key={item.id}
                        item={item}
                        type="preview"
                        currencyCode={cart.currency_code}
                        defaultStockMode={defaultStockMode}
                      />
                    )
                  })
            : repeat(5).map((i) => {
                return <SkeletonLineItem key={i} />
              })}
        </Table.Body>
      </Table>
    </div>
  )
}

type PreviewGroupProps = {
  group: ReturnType<typeof groupLineItemsByPreset>[0]
  currencyCode?: string
  defaultStockMode?: ProductStockMode
}

const PreviewGroup = ({
  group,
  currencyCode,
  defaultStockMode,
}: PreviewGroupProps) => {
  const sortedItems = group.items.sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <>
      <Table.Row
        style={{ background: "var(--ui-bg-subtle)" }}
        className="text-xs"
      >
        <Table.Cell colSpan={5} className="!p-2">
          <div className="flex items-center gap-1">
            <Text
              className="font-semibold text-xs"
              style={{ color: "var(--text)" }}
            >
              {group.presetTitle}
            </Text>
            {group.presetBadge && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--ui-button-inverted)",
                  color: "var(--ui-fg-on-inverted)",
                  fontSize: "10px",
                }}
              >
                {group.presetBadge}
              </span>
            )}
            <Text
              className="text-xs"
              style={{ color: "var(--text-dim)", marginInlineStart: "auto" }}
            >
              {group.totalQuantity}x
            </Text>
          </div>
        </Table.Cell>
      </Table.Row>
      {sortedItems.map((item) => (
        <Item
          key={item.id}
          item={item}
          type="preview"
          currencyCode={currencyCode}
          defaultStockMode={defaultStockMode}
        />
      ))}
    </>
  )
}

export default ItemsPreviewTemplate
