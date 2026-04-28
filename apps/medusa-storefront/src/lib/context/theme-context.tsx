"use client"

import {
  DEFAULT_THEME,
  isTheme,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  Theme,
} from "@lib/theme"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  toggle: () => {},
})

function resolveThemeFromDom(): Theme {
  if (typeof document === "undefined") {
    return DEFAULT_THEME
  }

  const domTheme = document.documentElement.getAttribute("data-theme")
  if (isTheme(domTheme)) {
    return domTheme
  }

  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(storedTheme)) {
      return storedTheme
    }
  } catch {}

  return DEFAULT_THEME
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme)
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; samesite=lax`

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveThemeFromDom)

  useEffect(() => {
    const resolvedTheme = resolveThemeFromDom()

    if (resolvedTheme !== theme) {
      setTheme(resolvedTheme)
      return
    }

    applyTheme(resolvedTheme)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
