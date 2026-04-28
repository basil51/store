import InteractiveLink from "@modules/common/components/interactive-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default async function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>Page not found</h1>
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        The page you tried to access does not exist.
      </p>
      <InteractiveLink href="/">Go to frontpage</InteractiveLink>
    </div>
  )
}
