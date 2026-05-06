"use client"

import {
  trackSearchResultsViewed,
  trackSearchSubmitted,
} from "@lib/util/analytics"
import {
  canFetchSearchSuggestions,
  getNavSearchSubmittedPayload,
  getNoSuggestionsTrackingUpdate,
  getRecoveredSuggestionsTrackingUpdate,
  normalizeSearchQuery,
} from "@lib/util/search"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

type SearchFormProps = {
  placeholder: string
  suggestionsLabel: string
  recoveredSuggestionsLabelTemplate: string
  noSuggestionsLabel: string
  viewAllResultsLabelTemplate: string
  viewRecoveredResultsLabelTemplate: string
  locale?: string | null
}

type SearchSuggestion = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
}

export default function SearchForm({
  placeholder,
  suggestionsLabel,
  recoveredSuggestionsLabelTemplate,
  noSuggestionsLabel,
  viewAllResultsLabelTemplate,
  viewRecoveredResultsLabelTemplate,
  locale,
}: SearchFormProps) {
  const { countryCode } = useParams<{ countryCode?: string }>()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [recoveredQuery, setRecoveredQuery] = useState<string | null>(null)
  const [recoverySource, setRecoverySource] = useState<"override" | "analytics" | null>(
    null
  )
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLFormElement>(null)
  const lastTrackedNoSuggestionsQueryRef = useRef<string | null>(null)
  const lastTrackedRecoveredSuggestionsKeyRef = useRef<string | null>(null)
  const normalizedQuery = normalizeSearchQuery(query)
  const storePath = countryCode ? `/${countryCode}/store` : "/store"

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!canFetchSearchSuggestions(normalizedQuery) || !countryCode) {
      setSuggestions([])
      setRecoveredQuery(null)
      setRecoverySource(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: normalizedQuery!,
          countryCode,
          ...(locale ? { locale } : {}),
        })
        const response = await fetch(`/api/search/suggestions?${params}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Unable to load search suggestions.")
        }

        const data = (await response.json()) as {
          suggestions?: SearchSuggestion[]
          recovered_query?: string | null
          recovery_source?: "override" | "analytics" | null
        }

        setSuggestions(data.suggestions ?? [])
        setRecoveredQuery(data.recovered_query ?? null)
        setRecoverySource(data.recovery_source ?? null)
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([])
          setRecoveredQuery(null)
          setRecoverySource(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [countryCode, normalizedQuery])

  useEffect(() => {
    const { nextTrackedQuery, trackQuery } = getNoSuggestionsTrackingUpdate({
      countryCode,
      isLoading,
      isOpen,
      lastTrackedQuery: lastTrackedNoSuggestionsQueryRef.current,
      normalizedQuery,
      recoveredQuery,
      suggestionCount: suggestions.length,
    })

    lastTrackedNoSuggestionsQueryRef.current = nextTrackedQuery

    if (!trackQuery) {
      return
    }

    trackSearchResultsViewed({
      query: trackQuery,
      result_count: 0,
      locale: locale ?? undefined,
      country_code: countryCode,
      source: "nav",
    })
  }, [
    countryCode,
    isLoading,
    isOpen,
    locale,
    normalizedQuery,
    recoveredQuery,
    suggestions.length,
  ])

  useEffect(() => {
    const { nextTrackedKey, trackOriginalQuery, trackRecoveredQuery } =
      getRecoveredSuggestionsTrackingUpdate({
        countryCode,
        isLoading,
        isOpen,
        lastTrackedKey: lastTrackedRecoveredSuggestionsKeyRef.current,
        normalizedQuery,
        recoveredQuery,
        recoverySource,
        suggestionCount: suggestions.length,
      })

    lastTrackedRecoveredSuggestionsKeyRef.current = nextTrackedKey

    if (!trackOriginalQuery || !trackRecoveredQuery) {
      return
    }

    trackSearchResultsViewed({
      query: trackOriginalQuery,
      result_count: 0,
      locale: locale ?? undefined,
      country_code: countryCode,
      source: "nav",
      recovered_query: trackRecoveredQuery,
    })

    trackSearchResultsViewed({
      query: trackRecoveredQuery,
      result_count: suggestions.length,
      locale: locale ?? undefined,
      country_code: countryCode,
      source: "nav",
      recovery_source: recoverySource,
      recovered_from_query: trackOriginalQuery,
      original_result_count: 0,
    })
  }, [
    countryCode,
    isLoading,
    isOpen,
    locale,
    normalizedQuery,
    recoveredQuery,
    recoverySource,
    suggestions.length,
  ])

  const resultHref = normalizedQuery
    ? `${storePath}?q=${encodeURIComponent(normalizedQuery)}`
    : storePath
  const recoveredResultHref = recoveredQuery
    ? `${storePath}?q=${encodeURIComponent(recoveredQuery)}`
    : resultHref
  const suggestionHeading = recoveredQuery
    ? recoveredSuggestionsLabelTemplate.replace("{query}", recoveredQuery)
    : suggestionsLabel
  const viewAllResultsLabel = recoveredQuery
    ? viewRecoveredResultsLabelTemplate.replace("{query}", recoveredQuery)
    : viewAllResultsLabelTemplate.replace("{query}", normalizedQuery ?? query)

  return (
    <form
      ref={wrapperRef}
      action={storePath}
      method="get"
      className="relative z-30 hidden small:flex flex-1 mx-6 max-w-xl isolate"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget)
        const payload = getNavSearchSubmittedPayload({
          query: String(formData.get("q") ?? ""),
          locale,
        })

        if (payload) {
          trackSearchSubmitted(payload)
        }
      }}
    >
      <div
        className="flex w-full items-center rounded-full px-4 py-2 gap-2 transition-all focus-within:ring-2"
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          "--tw-ring-color": "var(--teal)",
        } as React.CSSProperties}
      >
        <svg
          className="w-4 h-4 shrink-0"
          style={{ color: "var(--text-muted)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value

            setQuery(nextQuery)
            setIsLoading(
              Boolean(countryCode) &&
                canFetchSearchSuggestions(normalizeSearchQuery(nextQuery))
            )
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
          style={{ color: "var(--text)" }}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="nav-search-suggestions"
        />
      </div>
      {isOpen && canFetchSearchSuggestions(normalizedQuery) && (
        <div
          id="nav-search-suggestions"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[40] overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em]"
            style={{ color: "var(--text-dim)" }}
          >
            {suggestionHeading}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.id}
                href={`/${countryCode}/products/${suggestion.handle}`}
                className="flex items-center gap-3 border-t px-4 py-3 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--teal)_10%,transparent)]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
                onClick={() => setIsOpen(false)}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                  style={{ background: "var(--surface2)" }}
                >
                  {suggestion.thumbnail ? (
                    <img
                      src={suggestion.thumbnail}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span style={{ color: "var(--text-dim)" }}>⌕</span>
                  )}
                </span>
                <span className="line-clamp-2 flex-1">{suggestion.title}</span>
              </Link>
            ))}

            {!isLoading && !suggestions.length && (
              <div
                className="border-t px-4 py-3 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                {noSuggestionsLabel}
              </div>
            )}
          </div>
          <Link
            href={recoveredResultHref}
            className="block border-t px-4 py-3 text-sm font-bold uppercase tracking-[0.14em]"
            style={{ borderColor: "var(--border)", color: "var(--teal)" }}
            onClick={() => setIsOpen(false)}
          >
            {viewAllResultsLabel}
          </Link>
        </div>
      )}
    </form>
  )
}
