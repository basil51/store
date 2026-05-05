"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { getTenantPublishableKey } from "./cookies"
import { getRegionsCacheOptions, isRegionMapEntryFresh } from "./regions-cache"

export const listRegions = async () => {
  const next = {
    ...(await getRegionsCacheOptions("regions")),
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
    ...(await getRegionsCacheOptions(["regions", id].join("-"))),
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

const regionMapByTenant = new Map<
  string,
  { regionMap: Map<string, HttpTypes.StoreRegion>; updatedAt: number }
>()

export const getRegion = async (countryCode: string) => {
  try {
    const tenantPublishableKey = (await getTenantPublishableKey()) ?? "default"

    let cacheEntry = regionMapByTenant.get(tenantPublishableKey)

    if (!cacheEntry) {
      cacheEntry = {
        regionMap: new Map<string, HttpTypes.StoreRegion>(),
        updatedAt: 0,
      }
      regionMapByTenant.set(tenantPublishableKey, cacheEntry)
    }

    if (
      isRegionMapEntryFresh(cacheEntry.updatedAt) &&
      cacheEntry.regionMap.has(countryCode)
    ) {
      return cacheEntry.regionMap.get(countryCode)
    }

    const regions = await listRegions()

    if (!regions) {
      return null
    }

    cacheEntry.regionMap.clear()
    regions.forEach((region) => {
      region.countries?.forEach((c) => {
        cacheEntry?.regionMap.set(c?.iso_2 ?? "", region)
      })
    })
    cacheEntry.updatedAt = Date.now()

    // Always fall back to the first region (base/ILS region) for any
    // country code that isn't explicitly mapped. This ensures carts are
    // always created in the base currency, regardless of browsing country.
    // Frontend currency conversion is handled client-side via CurrencyContext.
    const baseRegion = regions[0]

    const region = countryCode
      ? (cacheEntry.regionMap.get(countryCode) ?? baseRegion)
      : baseRegion

    return region
  } catch (e: any) {
    return null
  }
}
