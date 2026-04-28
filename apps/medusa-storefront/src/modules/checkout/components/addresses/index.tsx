"use client"

import { setAddresses } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { useToggleState } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-row items-center justify-between mb-6">
        <h2
          className="font-syne text-xl font-black flex items-center gap-2"
          style={{ color: "var(--text)" }}
        >
          Shipping Address
          {!isOpen && <CheckCircleSolid style={{ color: "var(--teal)" }} />}
        </h2>
        {!isOpen && cart?.shipping_address && (
          <button
            onClick={handleEdit}
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--teal)" }}
            data-testid="edit-address-button"
          >
            Edit
          </button>
        )}
      </div>
      {isOpen ? (
        <form action={formAction}>
          <div className="pb-8">
            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div>
                <h3
                  className="font-syne text-lg font-bold pb-6 pt-8"
                  style={{ color: "var(--text)" }}
                >
                  Billing address
                </h3>

                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton className="mt-6" data-testid="submit-address-button">
              Continue to delivery
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div>
          {cart && cart.shipping_address ? (
            <div className="flex items-start gap-6 flex-wrap">
              <div className="flex flex-col min-w-[150px]" data-testid="shipping-address-summary">
                <span className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>Shipping Address</span>
                <span className="text-sm" style={{ color: "var(--text)" }}>{cart.shipping_address.first_name} {cart.shipping_address.last_name}</span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.shipping_address.address_1} {cart.shipping_address.address_2}</span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.shipping_address.postal_code}, {cart.shipping_address.city}</span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.shipping_address.country_code?.toUpperCase()}</span>
              </div>
              <div className="flex flex-col min-w-[150px]" data-testid="shipping-contact-summary">
                <span className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>Contact</span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.shipping_address.phone}</span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.email}</span>
              </div>
              <div className="flex flex-col min-w-[150px]" data-testid="billing-address-summary">
                <span className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-dim)" }}>Billing Address</span>
                {sameAsBilling ? (
                  <span className="text-sm" style={{ color: "var(--text-dim)" }}>Same as shipping</span>
                ) : (
                  <>
                    <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.billing_address?.first_name} {cart.billing_address?.last_name}</span>
                    <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.billing_address?.address_1} {cart.billing_address?.address_2}</span>
                    <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.billing_address?.postal_code}, {cart.billing_address?.city}</span>
                    <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cart.billing_address?.country_code?.toUpperCase()}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div><Spinner /></div>
          )}
        </div>
      )}
    </div>
  )
}

export default Addresses
