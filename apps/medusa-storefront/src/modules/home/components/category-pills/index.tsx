import { listCategories } from "@lib/data/categories"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Default emoji map for common category names (fallback)
const EMOJI_MAP: Record<string, string> = {
  mobile: "📱",
  phone: "📱",
  laptop: "💻",
  computer: "🖥️",
  desktop: "🖥️",
  tablet: "⊞",
  gaming: "🎮",
  audio: "🎧",
  speaker: "🔊",
  printer: "🖨️",
  monitor: "🖥️",
  accessories: "🔌",
  software: "💿",
  camera: "📷",
  tv: "📺",
  networking: "📡",
  storage: "💾",
  components: "⚙️",
}

function getEmoji(category: { metadata?: Record<string, unknown> | null; name: string }): string {
  if (category.metadata?.emoji && typeof category.metadata.emoji === "string") {
    return category.metadata.emoji
  }
  const lower = category.name.toLowerCase()
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji
  }
  return "🛒"
}

export default async function CategoryPills() {
  const locale = (await getLocale()) ?? "en"
  const t = (key: Parameters<typeof getUiCopy>[1], params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const categories = await listCategories({ limit: 16 })

  // only top-level
  const topLevel = categories
    .filter((c) => !c.parent_category_id)
    .slice(0, 8)

  if (!topLevel.length) return null

  return (
    <section className="content-container py-6">
      <h2
        className="font-syne mb-5 text-lg font-bold"
        style={{ color: "var(--text)" }}
      >
        {t("categoryPillsTitle")}
      </h2>
      <div className="grid grid-cols-2 gap-3 xsmall:grid-cols-4 small:grid-cols-4 large:grid-cols-8">
        {topLevel.map((cat) => (
          <LocalizedClientLink
            key={cat.id}
            href={`/categories/${cat.handle}`}
            className="group flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center transition-all duration-200 hover:-translate-y-1"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="text-3xl transition-transform duration-200 group-hover:scale-110">
              {getEmoji(cat)}
            </span>
            <span
              className="text-xs font-semibold leading-tight"
              style={{ color: "var(--text-dim)" }}
            >
              {cat.name}
            </span>
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}
