"use client"

import { ArrowRightOnRectangle } from "@medusajs/icons"
import { useParams, usePathname } from "next/navigation"

import ChevronDown from "@modules/common/icons/chevron-down"
import User from "@modules/common/icons/user"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { signout } from "@lib/data/customer"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getAccountCopy } from "@modules/account/account-copy"

const AccountNav = ({ customer }: { customer: HttpTypes.StoreCustomer | null }) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1], params?: Record<string, string | number>) =>
    getAccountCopy(locale, key, params)

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const NAV_ITEMS = [
    { href: "/account", label: t("overview"), icon: <User size={16} />, testId: "overview-link" },
    { href: "/account/profile", label: t("profile"), icon: <User size={16} />, testId: "profile-link" },
    { href: "/account/addresses", label: t("addresses"), icon: <MapPin size={16} />, testId: "addresses-link" },
    { href: "/account/orders", label: t("orders"), icon: <Package size={16} />, testId: "orders-link" },
  ]

  return (
    <>
      {/* Mobile: back link or menu */}
      <div className="small:hidden" data-testid="mobile-account-nav">
        {route !== `/${countryCode}/account` ? (
          <LocalizedClientLink
            href="/account"
            className="flex items-center gap-2 py-2 text-sm"
            style={{ color: "var(--text-dim)" }}
            data-testid="account-main-link"
          >
            <ChevronDown className="rotate-90" />
            <span>{t("account")}</span>
          </LocalizedClientLink>
        ) : (
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p
              className="font-syne mb-3 text-lg font-bold"
              style={{ color: "var(--text)" }}
            >
              {t("helloUser", { name: customer?.first_name ?? "" })}
            </p>
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <LocalizedClientLink
                    href={item.href}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors"
                    style={{ color: "var(--text-dim)" }}
                    data-testid={item.testId}
                  >
                    <div className="flex items-center gap-2">{item.icon}{item.label}</div>
                    <ChevronDown className="-rotate-90" />
                  </LocalizedClientLink>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors"
                  style={{ color: "var(--coral)" }}
                  data-testid="logout-button"
                >
                  <ArrowRightOnRectangle />
                  {t("logOut")}
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <div
        className="hidden small:block rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        data-testid="account-nav"
      >
        <p
          className="font-syne mb-1 text-xs font-black uppercase tracking-widest"
          style={{ color: "var(--teal)" }}
        >
          {t("myAccount")}
        </p>
        <p
          className="mb-5 text-sm font-medium truncate"
          style={{ color: "var(--text-dim)" }}
        >
          {customer?.email}
        </p>

        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <AccountNavLink key={item.href} href={item.href} route={route} icon={item.icon} testId={item.testId}>
              {item.label}
            </AccountNavLink>
          ))}

          <li className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[rgba(255,94,98,0.08)]"
              style={{ color: "var(--coral)" }}
              data-testid="logout-button"
            >
              <ArrowRightOnRectangle />
              {t("logOut")}
            </button>
          </li>
        </ul>
      </div>
    </>
  )
}

type AccountNavLinkProps = {
  href: string
  route: string
  children: React.ReactNode
  icon?: React.ReactNode
  testId?: string
}

const AccountNavLink = ({ href, route, children, icon, testId }: AccountNavLinkProps) => {
  const { countryCode }: { countryCode: string } = useParams()
  const active = route.split(countryCode)[1] === href

  return (
    <li>
      <LocalizedClientLink
        href={href}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all"
        style={{
          background: active ? "rgba(0,229,200,0.1)" : "transparent",
          color: active ? "var(--teal)" : "var(--text-dim)",
          borderLeft: active ? "2px solid var(--teal)" : "2px solid transparent",
        }}
        data-testid={testId}
      >
        {icon}
        {children}
      </LocalizedClientLink>
    </li>
  )
}

export default AccountNav
