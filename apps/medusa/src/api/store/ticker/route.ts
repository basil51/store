import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const DEFAULT_MESSAGES = [
  "🚀 Free shipping on orders over $99",
  "⚡ Flash deals updated daily — don't miss out",
  "🎮 New gaming peripherals just dropped",
  "💻 Up to 40% off laptops this week",
  "🔒 Secure checkout · 30-day returns · 2-year warranty",
  "📦 Same-day dispatch on in-stock orders before 3 PM",
  "🌍 International shipping available",
  "💡 Tip: use your account to track orders in real time",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const storeModule = req.scope.resolve(Modules.STORE)
    const [store] = await storeModule.listStores({})

    const meta = (store?.metadata ?? {}) as Record<string, unknown>
    const saved = Array.isArray(meta.ticker_messages)
      ? (meta.ticker_messages as unknown[]).filter(
          (m): m is string => typeof m === "string"
        )
      : []

    const messages = saved.length ? saved : DEFAULT_MESSAGES

    res.json({ messages })
  } catch {
    // Fallback to defaults on any error
    res.json({ messages: DEFAULT_MESSAGES })
  }
}
