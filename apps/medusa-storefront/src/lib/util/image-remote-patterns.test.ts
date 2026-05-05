import { describe, expect, it } from "vitest"

const {
  buildImageRemotePatterns,
  parseRemotePatternList,
} = require("../../../image-remote-patterns")

describe("image remote pattern policy", () => {
  it("parses CDN URL patterns from env-style comma lists", () => {
    expect(
      parseRemotePatternList(
        "https://cdn.example.com/medusa/**, https://images.example.com"
      )
    ).toEqual([
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/medusa/**",
      },
      {
        protocol: "https",
        hostname: "images.example.com",
        pathname: "/**",
      },
    ])
  })

  it("normalizes Medusa Cloud paths and appends configured CDN hosts", () => {
    const patterns = buildImageRemotePatterns({
      s3Hostname: "assets.example.com",
      s3Pathname: "/tenant-media",
      additionalRemotePatterns: "https://cdn.example.com/store/**",
    })

    expect(patterns).toContainEqual({
      protocol: "https",
      hostname: "assets.example.com",
      pathname: "/tenant-media/**",
    })
    expect(patterns).toContainEqual({
      protocol: "https",
      hostname: "cdn.example.com",
      pathname: "/store/**",
    })
  })

  it("rejects invalid configured remote patterns early", () => {
    expect(() => parseRemotePatternList("ftp://cdn.example.com/images/**")).toThrow(
      /http or https/
    )
    expect(() => parseRemotePatternList("not-a-url")).toThrow(
      /Invalid NEXT_IMAGE_REMOTE_PATTERNS/
    )
  })
})
