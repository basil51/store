"use server"

import { sdk } from "@lib/config"

const FALLBACK: string[] = [
  "🚀 Free shipping on orders over $99",
  "⚡ Flash deals updated daily — don't miss out",
  "🎮 New gaming peripherals just dropped",
  "💻 Up to 40% off laptops this week",
  "🔒 Secure checkout · 30-day returns · 2-year warranty",
  "📦 Same-day dispatch on in-stock orders before 3 PM",
  "🌍 International shipping available",
  "💡 Tip: use your account to track orders in real time",
]

export async function getTickerMessages(): Promise<string[]> {
  try {
    const data = await sdk.client.fetch<{ messages: string[] }>(
      "/store/ticker",
      {
        method: "GET",
        next: { revalidate: 60 },
        cache: "force-cache",
      }
    )
    const msgs = data?.messages
    return Array.isArray(msgs) && msgs.length ? msgs : FALLBACK
  } catch {
    return FALLBACK
  }
}
