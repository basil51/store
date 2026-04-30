"use client"

import { useState } from "react"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getAccountCopy } from "@modules/account/account-copy"

import Register from "@modules/account/components/register"
import Login from "@modules/account/components/login"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState<LOGIN_VIEW>(LOGIN_VIEW.SIGN_IN)
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) => getAccountCopy(locale, key)

  return (
    <div
      className="flex min-h-[80vh] items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--teal) 8%, transparent), transparent 70%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{
              background: "color-mix(in srgb, var(--teal) 15%, transparent)",
              color: "var(--teal)",
              border: "1px solid color-mix(in srgb, var(--teal) 30%, transparent)",
            }}
          >
            NEXMART
          </span>
          <h1
            className="mt-4 font-syne text-3xl font-black leading-tight"
            style={{ color: "var(--text)" }}
          >
            {currentView === LOGIN_VIEW.SIGN_IN ? t("loginWelcomeBack") : t("createYourAccount")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
            {currentView === LOGIN_VIEW.SIGN_IN
              ? t("loginIntro")
              : t("registerIntro")}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6 small:p-8"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-elevated)",
            boxShadow:
              "0 4px 6px -1px color-mix(in srgb, #000 10%, transparent), 0 20px 40px -8px color-mix(in srgb, #000 15%, transparent)",
          }}
        >
          {/* Tab switcher */}
          <div
            className="mb-6 grid grid-cols-2 gap-1 rounded-xl p-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
              className="rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200"
              style={
                currentView === LOGIN_VIEW.SIGN_IN
                  ? { background: "var(--teal)", color: "#04100d" }
                  : { color: "var(--text-dim)" }
              }
            >
              {t("loginTabSignIn")}
            </button>
            <button
              onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
              className="rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200"
              style={
                currentView === LOGIN_VIEW.REGISTER
                  ? { background: "var(--teal)", color: "#04100d" }
                  : { color: "var(--text-dim)" }
              }
            >
              {t("loginTabCreateAccount")}
            </button>
          </div>

          {currentView === LOGIN_VIEW.SIGN_IN ? (
            <Login setCurrentView={setCurrentView} />
          ) : (
            <Register setCurrentView={setCurrentView} />
          )}
        </div>

        {/* Feature hints */}
        <div className="mt-6 flex items-center justify-center gap-5 text-xs" style={{ color: "var(--text-dim)" }}>
          {[t("featureOrderTracking"), t("featureSavedAddresses"), t("featureFastCheckout")].map((feature) => (
            <span key={feature} className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--teal)", opacity: 0.7 }}
              />
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LoginTemplate
