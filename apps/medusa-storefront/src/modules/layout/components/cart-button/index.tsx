import { retrieveCart } from "@lib/data/cart"
import { getStorefrontSettings } from "@lib/data/currency"
import { DEFAULT_WHATSAPP_TEMPLATES } from "@lib/util/whatsapp"
import CartDropdown from "../cart-dropdown"

export default async function CartButton() {
  const cart = await retrieveCart().catch(() => null)
  const storeSettings = await getStorefrontSettings().catch(() => ({
    storeName: "",
    baseCurrency: "ILS" as const,
    currencies: [],
    cartMode: "standard" as const,
    whatsappNumber: "",
    whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATES.en,
    whatsappTemplates: DEFAULT_WHATSAPP_TEMPLATES,
    freeShippingThreshold: null,
    defaultStockMode: "track_visible" as const,
    variantCombinationDefaultsByType: {},
  }))

  return <CartDropdown cart={cart} storeSettings={storeSettings} />
}
