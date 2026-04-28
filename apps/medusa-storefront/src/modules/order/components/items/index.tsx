import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Table, Text } from "@medusajs/ui"

import Divider from "@modules/common/components/divider"
import Item from "@modules/order/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import {
  groupLineItemsByPreset,
  shouldDisplayPresetGrouping,
} from "@lib/util/cart-grouping"

type ItemsProps = {
  order: HttpTypes.StoreOrder
}

const Items = ({ order }: ItemsProps) => {
  const items = order.items
  const displayGrouping = shouldDisplayPresetGrouping(items)
  const groupedItems = displayGrouping && items ? groupLineItemsByPreset(items) : null

  return (
    <div className="flex flex-col">
      <Divider className="!mb-0" />
      <Table>
        <Table.Body data-testid="products-table">
          {items?.length
            ? displayGrouping && groupedItems
              ? groupedItems.map((group) => (
                  <OrderGroup
                    key={group.presetKey}
                    group={group}
                    currencyCode={order.currency_code}
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
                        currencyCode={order.currency_code}
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

type OrderGroupProps = {
  group: ReturnType<typeof groupLineItemsByPreset>[0]
  currencyCode?: string
}

const OrderGroup = ({ group, currencyCode }: OrderGroupProps) => {
  const sortedItems = group.items.sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <>
      <Table.Row style={{ background: "var(--ui-bg-subtle)" }}>
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
              className="text-xs ml-auto"
              style={{ color: "var(--text-dim)" }}
            >
              {group.totalQuantity} items
            </Text>
          </div>
        </Table.Cell>
      </Table.Row>
      {sortedItems.map((item) => (
        <Item
          key={item.id}
          item={item}
          currencyCode={currencyCode}
        />
      ))}
    </>
  )
}

export default Items
