import { HttpTypes } from "@medusajs/types"

type LineItemSetupProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  compact?: boolean
}

const LineItemSetup = ({ item, compact = false }: LineItemSetupProps) => {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>
  const presetTitle =
    typeof metadata.variant_combination_title === "string"
      ? metadata.variant_combination_title.trim()
      : ""
  const presetBadge =
    typeof metadata.variant_combination_badge === "string"
      ? metadata.variant_combination_badge.trim()
      : ""
  const presetIsDefault = metadata.variant_combination_is_default === true

  if (!presetTitle) {
    return null
  }

  if (compact) {
    const compactParts = [
      `Setup: ${presetTitle}`,
      ...(presetBadge ? [presetBadge] : []),
      ...(presetIsDefault ? ["Default"] : []),
    ]

    return (
      <p
        className="mt-1 text-[10px] font-medium truncate"
        style={{ color: "var(--teal)" }}
        title={compactParts.join(" · ")}
        data-testid="line-item-setup-compact"
      >
        {compactParts.join(" · ")}
      </p>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="line-item-setup">
      <span
        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
        style={{
          background: "rgba(0, 229, 200, 0.12)",
          color: "var(--teal)",
        }}
      >
        Setup: {presetTitle}
      </span>
      {presetBadge ? (
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            color: "var(--text-dim)",
          }}
        >
          {presetBadge}
        </span>
      ) : null}
      {presetIsDefault ? (
        <span
          className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full"
          style={{
            background: "rgba(255, 196, 0, 0.12)",
            color: "#b45309",
          }}
        >
          Default preset
        </span>
      ) : null}
    </div>
  )
}

export default LineItemSetup