export type Theme = "dark" | "light"

export const THEME_STORAGE_KEY = "nx-theme"
export const THEME_COOKIE_NAME = "nx-theme"
export const DEFAULT_THEME: Theme = "dark"

export const THEME_BACKGROUND: Record<Theme, string> = {
  dark: "#0c0e14",
  light: "#f4f6fb",
}

export const THEME_TEXT: Record<Theme, string> = {
  dark: "#f0f2f8",
  light: "#0c0e14",
}

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "dark" || value === "light"
}