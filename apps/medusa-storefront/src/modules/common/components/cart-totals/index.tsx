"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  const Row = ({
    label,
    value,
    highlight,
    testId,
    testValue,
  }: {
    label: string
    value: string
    highlight?: boolean
    testId?: string
    testValue?: number
  }) => (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <span
        style={{ color: highlight ? "var(--coral)" : "var(--text-dim)" }}
        data-testid={testId}
        data-value={testValue}
      >
        {value}
      </span>
    </div>
  )

  return (
    <div className="flex flex-col gap-y-2">
      <Row
        label="Subtotal (excl. shipping and taxes)"
        value={convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
        testId="cart-subtotal"
        testValue={item_subtotal ?? 0}
      />
      <Row
        label="Shipping"
        value={convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
        testId="cart-shipping"
        testValue={shipping_subtotal ?? 0}
      />
      {!!discount_subtotal && (
        <Row
          label="Discount"
          value={`- ${convertToLocale({ amount: discount_subtotal ?? 0, currency_code })}`}
          highlight
          testId="cart-discount"
          testValue={discount_subtotal ?? 0}
        />
      )}
      <Row
        label="Taxes"
        value={convertToLocale({ amount: tax_total ?? 0, currency_code })}
        testId="cart-taxes"
        testValue={tax_total ?? 0}
      />

      <div className="my-3 h-px" style={{ background: "var(--border)" }} />

      <div className="flex items-center justify-between">
        <span className="font-semibold" style={{ color: "var(--text)" }}>
          Total
        </span>
        <span
          className="text-xl font-black"
          style={{ color: "var(--teal)" }}
          data-testid="cart-total"
          data-value={total ?? 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>

      <div className="h-px" style={{ background: "var(--border)" }} />
    </div>
  )
}

export default CartTotals
