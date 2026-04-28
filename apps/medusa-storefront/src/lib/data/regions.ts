"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions, getTenantPublishableKey } from "./cookies"

export const listRegions = async () => {
  const next = {
    ...(await getCacheOptions("regions")),
  }

  return sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
    .catch(medusaError)
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  }

  return sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
    .catch(medusaError)
}

const regionMapByTenant = new Map<string, Map<string, HttpTypes.StoreRegion>>()

export const getRegion = async (countryCode: string) => {
  try {
    const tenantPublishableKey = (await getTenantPublishableKey()) ?? "default"

    let regionMap = regionMapByTenant.get(tenantPublishableKey)

    if (!regionMap) {
      regionMap = new Map<string, HttpTypes.StoreRegion>()
      regionMapByTenant.set(tenantPublishableKey, regionMap)
    }

    if (regionMap.has(countryCode)) {
      return regionMap.get(countryCode)
    }

    const regions = await listRegions()

    if (!regions) {
      return null
    }

    regions.forEach((region) => {
      region.countries?.forEach((c) => {
        regionMap.set(c?.iso_2 ?? "", region)
      })
    })

    // Always fall back to the first region (base/ILS region) for any
    // country code that isn't explicitly mapped. This ensures carts are
    // always created in the base currency, regardless of browsing country.
    // Frontend currency conversion is handled client-side via CurrencyContext.
    const baseRegion = regions[0]

    const region = countryCode
      ? (regionMap.get(countryCode) ?? baseRegion)
      : baseRegion

    return region
  } catch (e: any) {
    return null
  }
}
