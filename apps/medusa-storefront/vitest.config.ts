import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@lib": fileURLToPath(new URL("./src/lib", import.meta.url)),
      "@modules": fileURLToPath(new URL("./src/modules", import.meta.url)),
      "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})