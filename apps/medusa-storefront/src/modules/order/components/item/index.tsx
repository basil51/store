import { HttpTypes } from "@medusajs/types"
import { Table, Text } from "@medusajs/ui"

import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemSetup from "@modules/common/components/line-item-setup"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

const Item = ({ item, currencyCode }: ItemProps) => {
  return (
    <Table.Row className="w-full" data-testid="product-row">
      <Table.Cell className="p-4 w-24" style={{ paddingInlineStart: 0 }}>
        <div className="flex w-16">
          <Thumbnail thumbnail={item.thumbnail} size="square" />
        </div>
      </Table.Cell>

      <Table.Cell style={{ textAlign: "start" }}>
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--text)" }}
          data-testid="product-name"
        >
          {item.product_title}
        </p>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        <LineItemSetup item={item} />
      </Table.Cell>

      <Table.Cell style={{ paddingInlineEnd: 0 }}>
        <span
          className="flex flex-col items-end h-full justify-center"
          style={{ paddingInlineEnd: 0 }}
        >
          <span className="flex gap-x-1">
            <span
              className="text-xs"
              style={{ color: "var(--text-dim)" }}
            >
              <span data-testid="product-quantity">{item.quantity}</span>x{" "}
            </span>
            <LineItemUnitPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </span>

          <LineItemPrice
            item={item}
            style="tight"
          />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

export default Item
