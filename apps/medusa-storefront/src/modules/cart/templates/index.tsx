import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import { HttpTypes } from "@medusajs/types"
import type { StorefrontSettings } from "@lib/types/storefront-settings"

const CartTemplate = ({
  cart,
  customer,
  storeSettings,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  storeSettings: StorefrontSettings
}) => {
  return (
    <div className="py-12" style={{ background: "var(--bg)" }}>
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 gap-8 small:grid-cols-[1fr_360px]">
            {/* Line items */}
            <div
              className="flex flex-col gap-y-6 rounded-2xl p-6 small:p-8"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {!customer && <SignInPrompt />}
              <ItemsTemplate cart={cart} />
            </div>

            {/* Summary */}
            <div className="relative">
              <div
                className="sticky top-12 flex flex-col gap-y-6 rounded-2xl p-6"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {cart?.region && <Summary cart={cart as any} storeSettings={storeSettings} />}
              </div>
            </div>
          </div>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplate
