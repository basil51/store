type SpecificationValue = {
  group?: string
  label: string
  values: string[]
  option?: string
}

export type SpecificationGroup = {
  title: string | null
  items: SpecificationValue[]
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  return []
}

export function parseProductSpecifications(
  metadata?: Record<string, unknown> | null
): SpecificationValue[] {
  const rawSpecifications = metadata?.specifications

  if (!Array.isArray(rawSpecifications)) {
    return []
  }

  return rawSpecifications
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }

      const record = entry as Record<string, unknown>
      const group = typeof record.group === "string" ? record.group.trim() : ""
      const label = typeof record.label === "string" ? record.label.trim() : ""
      const option = typeof record.option === "string" ? record.option.trim() : ""
      const values = toStringArray(record.values ?? record.value)

      if (!label || (!values.length && !option)) {
        return null
      }

      return {
        group: group || undefined,
        label,
        values,
        option: option || undefined,
      }
    })
    .filter((entry): entry is SpecificationValue => entry !== null)
}

export function groupProductSpecifications(
  specifications: SpecificationValue[]
): SpecificationGroup[] {
  const groups = new Map<string, SpecificationGroup>()
  const orderedGroups: SpecificationGroup[] = []

  for (const specification of specifications) {
    const key = specification.group ?? ""

    if (!groups.has(key)) {
      const group = {
        title: specification.group ?? null,
        items: [],
      }

      groups.set(key, group)
      orderedGroups.push(group)
    }

    groups.get(key)?.items.push(specification)
  }

  return orderedGroups
}