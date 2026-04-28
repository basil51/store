import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Table, Text } from "@medusajs/ui"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import {
  groupLineItemsByPreset,
  shouldDisplayPresetGrouping,
} from "@lib/util/cart-grouping"
import type { ProductStockMode } from "@lib/util/stock-mode"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
  defaultStockMode?: ProductStockMode
}

const ItemsTemplate = ({ cart, defaultStockMode }: ItemsTemplateProps) => {
  const items = cart?.items
  const displayGrouping = shouldDisplayPresetGrouping(items)
  const groupedItems = displayGrouping && items ? groupLineItemsByPreset(items) : null

  return (
    <div>
      <div className="pb-4 flex items-center">
        <h2
          className="font-syne text-2xl font-bold"
          style={{ color: "var(--text)" }}
        >
          Cart
        </h2>
      </div>
      <Table>
        <Table.Header className="border-t-0">
          <Table.Row>
            <Table.HeaderCell
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-dim)", paddingInlineStart: 0 }}
              colSpan={2}
            >
              Item
            </Table.HeaderCell>
            <Table.HeaderCell
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Quantity
            </Table.HeaderCell>
            <Table.HeaderCell
              className="hidden small:table-cell text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Price
            </Table.HeaderCell>
            <Table.HeaderCell
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                color: "var(--text-dim)",
                paddingInlineEnd: 0,
                textAlign: "end",
              }}
            >
              Total
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items
            ? displayGrouping && groupedItems
              ? groupedItems.map((group) => (
                  <Group
                    key={group.presetKey}
                    group={group}
                    currencyCode={cart?.currency_code}
                    defaultStockMode={defaultStockMode}
                  />
                ))
              : items
                  .sort((a, b) =>
                    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                  )
                  .map((item) => (
                    <Item
                      key={item.id}
                      item={item}
                      currencyCode={cart?.currency_code}
                      defaultStockMode={defaultStockMode}
                    />
                  ))
            : repeat(5).map((i) => <SkeletonLineItem key={i} />)}
        </Table.Body>
      </Table>
    </div>
  )
}

type GroupProps = {
  group: ReturnType<typeof groupLineItemsByPreset>[0]
  currencyCode?: string
  defaultStockMode?: ProductStockMode
}

const Group = ({ group, currencyCode, defaultStockMode }: GroupProps) => {
  const sortedItems = group.items.sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <>
      <Table.Row className="bg-opacity-50" style={{ background: "var(--ui-bg-subtle)" }}>
        <Table.Cell colSpan={5} className="!p-3">
          <div className="flex items-center gap-2">
            <Text
              className="font-semibold"
              style={{ color: "var(--text)" }}
            >
              {group.presetTitle}
            </Text>
            {group.presetBadge && (
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  background: "var(--ui-button-inverted)",
                  color: "var(--ui-fg-on-inverted)",
                }}
              >
                {group.presetBadge}
              </span>
            )}
            <Text
              className="text-xs"
              style={{ color: "var(--text-dim)", marginInlineStart: "auto" }}
            >
              {group.totalQuantity} items · Total: ${group.totalPrice.toFixed(2)}
            </Text>
          </div>
        </Table.Cell>
      </Table.Row>
      {sortedItems.map((item) => (
        <Item
          key={item.id}
          item={item}
          currencyCode={currencyCode}
          defaultStockMode={defaultStockMode}
        />
      ))}
    </>
  )
}

export default ItemsTemplate
