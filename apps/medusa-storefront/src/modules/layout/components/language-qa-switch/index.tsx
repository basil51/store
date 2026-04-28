"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { updateLocale } from "@lib/data/locale-actions"
import { Locale } from "@lib/data/locales"

type LanguageQaSwitchProps = {
  locales: Locale[] | null
  currentLocale: string | null
  compact?: boolean
}

type LanguageOption = {
  code: string
  label: string
  shortCode: string
}

const RTL_QA_PRIORITY = ["en", "ar", "he"]

const RTL_QA_LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  he: "Hebrew",
}

const normalizeLocaleCode = (value: string | null | undefined) =>
  value?.split(/[-_]/)[0]?.toLowerCase() ?? "en"

const LanguageQaSwitch = ({
  locales,
  currentLocale,
  compact = false,
}: LanguageQaSwitchProps) => {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)

  const options = useMemo<LanguageOption[]>(() => {
    const labelsByCode = new Map<string, string>()

    const addOption = (code: string, label: string) => {
      const normalizedCode = normalizeLocaleCode(code)
      if (!labelsByCode.has(normalizedCode)) {
        labelsByCode.set(normalizedCode, label)
      }
    }

    // Keep explicit EN/AR/HE options so QA language toggling is always available.
    addOption("en", "English")
    addOption("ar", "Arabic")
    addOption("he", "Hebrew")

    locales?.forEach((locale) => {
      addOption(locale.code, locale.name)
    })

    return RTL_QA_PRIORITY.map((code) => {
      const normalizedCode = normalizeLocaleCode(code)

      return {
        code: normalizedCode,
        label: labelsByCode.get(code) ?? RTL_QA_LANGUAGE_LABELS[code],
        shortCode: normalizedCode.toUpperCase(),
      }
    })
  }, [locales])

  const activeCode = normalizeLocaleCode(currentLocale)
  const selectedCode = options.some((option) => option.code === activeCode)
    ? activeCode
    : options[0]?.code ?? "en"

  const selectedOption =
    options.find((option) => option.code === selectedCode) ?? options[0]

  const triggerWidthClass = compact ? "w-[64px]" : "w-[70px]"

  useEffect(() => {
    if (!open) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const handleLocaleChange = (nextLocale: string) => {
    setOpen(false)

    startTransition(async () => {
      await updateLocale(nextLocale)
      router.refresh()
    })
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-center rounded-full border p-1"
      style={{
        background: "var(--surface2)",
        borderColor: "var(--border)",
      }}
      data-testid="language-qa-switch"
    >
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        disabled={isPending}
        aria-expanded={open}
        aria-haspopup="menu"
        accessKey="l"
        title="Language switcher for RTL/LTR testing (access key: L)"
        className={`inline-flex items-center justify-center rounded-md border px-1.5 py-1 text-xs font-bold uppercase tracking-wide outline-none ${triggerWidthClass}`}
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
        data-testid="language-qa-select"
      >
        <span>{selectedOption?.shortCode ?? "EN"}</span>
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] z-[120] min-w-[160px] overflow-hidden rounded-xl border shadow-xl"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            insetInlineEnd: 0,
          }}
          data-testid="language-qa-menu"
        >
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => handleLocaleChange(option.code)}
              role="menuitem"
              className="w-full px-3 py-2 text-sm [text-align:start] transition-colors"
              style={{
                background:
                  option.code === selectedCode
                    ? "var(--surface2)"
                    : "transparent",
                color:
                  option.code === selectedCode
                    ? "var(--teal)"
                    : "var(--text)",
                fontWeight: option.code === selectedCode ? 700 : 500,
              }}
              data-testid={`language-option-${option.code}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageQaSwitch