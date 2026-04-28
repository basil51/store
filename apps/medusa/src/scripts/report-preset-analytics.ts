import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  PRESET_ANALYTICS_TABLE,
  ensurePresetAnalyticsTable,
} from "../shared/preset-analytics"

type ReportOptions = {
  days: number
  from?: Date
  to?: Date
  limit: number
}

const normalizeArgs = (args: string[]) => {
  const processArgv = process.argv
  const separatorIndex = processArgv.lastIndexOf("--")
  const argvArgs =
    separatorIndex >= 0 ? processArgv.slice(separatorIndex + 1) : processArgv.slice(2)

  const candidateArgs = args.length >= 1 ? args : argvArgs
  return candidateArgs[0] === "--" ? candidateArgs.slice(1) : candidateArgs
}

const readNumberFlag = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric value: ${value}`)
  }

  return Math.floor(parsed)
}

const readDateFlag = (value: string | undefined) => {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`)
  }

  return parsed
}

const parseOptions = (args: string[]): ReportOptions => {
  const normalizedArgs = normalizeArgs(args)
  const flags = normalizedArgs.reduce<Record<string, string>>((acc, arg) => {
    if (!arg.startsWith("--")) {
      return acc
    }

    const [flag, value] = arg.slice(2).split("=", 2)

    if (flag && value) {
      acc[flag] = value
    }

    return acc
  }, {})

  const days = readNumberFlag(flags.days, 30)
  const limit = readNumberFlag(flags.limit, 20)
  const from = readDateFlag(flags.from)
  const to = readDateFlag(flags.to)

  return {
    days,
    from,
    to,
    limit,
  }
}

const toNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

export default async function reportPresetAnalytics({
  container,
  args,
}: ExecArgs) {
  const db = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const options = parseOptions(args)

  await ensurePresetAnalyticsTable(db)

  const toDate = options.to ?? new Date()
  const fromDate =
    options.from ??
    new Date(toDate.getTime() - options.days * 24 * 60 * 60 * 1000)

  const baseQuery = db(PRESET_ANALYTICS_TABLE).whereBetween("occurred_at", [
    fromDate.toISOString(),
    toDate.toISOString(),
  ])

  const [totalsByEvent, topPresets, purchasedPresets] = await Promise.all([
    baseQuery
      .clone()
      .select("event_name")
      .count({ events: "*" })
      .groupBy("event_name")
      .orderBy("events", "desc"),
    baseQuery
      .clone()
      .select("preset_key", "preset_title")
      .count({ events: "*" })
      .sum({ quantity: "quantity" })
      .groupBy("preset_key", "preset_title")
      .orderBy("events", "desc")
      .limit(options.limit),
    baseQuery
      .clone()
      .where("event_name", "preset_purchased")
      .select("preset_key", "preset_title")
      .count({ purchases: "*" })
      .sum({ purchased_quantity: "quantity" })
      .sum({ revenue: "amount" })
      .groupBy("preset_key", "preset_title")
      .orderBy("purchases", "desc")
      .limit(options.limit),
  ])

  const output = {
    range: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
    totals_by_event: totalsByEvent.map((entry: any) => ({
      event_name: entry.event_name,
      events: toNumber(entry.events),
    })),
    top_presets: topPresets.map((entry: any) => ({
      preset_key: entry.preset_key,
      preset_title: entry.preset_title,
      events: toNumber(entry.events),
      quantity: toNumber(entry.quantity),
    })),
    purchased_presets: purchasedPresets.map((entry: any) => ({
      preset_key: entry.preset_key,
      preset_title: entry.preset_title,
      purchases: toNumber(entry.purchases),
      purchased_quantity: toNumber(entry.purchased_quantity),
      revenue: toNumber(entry.revenue),
    })),
  }

  console.log(JSON.stringify(output, null, 2))
}
