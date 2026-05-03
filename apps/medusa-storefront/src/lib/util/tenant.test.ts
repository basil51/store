import { describe, expect, it } from "vitest"

import {
  getTenantServerCookieDeletionOptions,
  getTenantServerCookieOptions,
} from "./tenant"

describe("tenant cookie security options", () => {
  it("marks server-managed tenant cookies as httpOnly with strict same-site scope", () => {
    expect(getTenantServerCookieOptions(3600, "production")).toEqual({
      maxAge: 3600,
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
    })

    expect(getTenantServerCookieOptions(3600, "development")).toEqual({
      maxAge: 3600,
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
    })
  })

  it("uses the same hardened boundary for deletion writes", () => {
    expect(getTenantServerCookieDeletionOptions("production")).toEqual({
      maxAge: -1,
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
    })
  })
})