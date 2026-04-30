import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState, useRef } from "react"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getAccountCopy } from "@modules/account/account-copy"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

type DevCredential = {
  label: string
  email: string
  password: string
}

const DEV_CREDENTIALS: DevCredential[] = [
  {
    label: "Super Admin",
    email:
      process.env.NEXT_PUBLIC_DEV_LOGIN_SUPER_ADMIN_EMAIL ??
      "customer.super-admin@example.com",
    password: process.env.NEXT_PUBLIC_DEV_LOGIN_SUPER_ADMIN_PASSWORD ?? "Password123!",
  },
  {
    label: "Store Owner",
    email:
      process.env.NEXT_PUBLIC_DEV_LOGIN_STORE_OWNER_EMAIL ??
      "customer.store-owner@example.com",
    password: process.env.NEXT_PUBLIC_DEV_LOGIN_STORE_OWNER_PASSWORD ?? "Password123!",
  },
  {
    label: "Manager",
    email:
      process.env.NEXT_PUBLIC_DEV_LOGIN_MANAGER_EMAIL ?? "customer.manager@example.com",
    password: process.env.NEXT_PUBLIC_DEV_LOGIN_MANAGER_PASSWORD ?? "Password123!",
  },
  {
    label: "Staff",
    email:
      process.env.NEXT_PUBLIC_DEV_LOGIN_STAFF_EMAIL ?? "customer.staff@example.com",
    password: process.env.NEXT_PUBLIC_DEV_LOGIN_STAFF_PASSWORD ?? "Password123!",
  },
]

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) => getAccountCopy(locale, key)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  const fillCredentials = (credential: DevCredential) => {
    if (!emailRef.current || !passwordRef.current) {
      return
    }

    emailRef.current.value = credential.email
    passwordRef.current.value = credential.password
    emailRef.current.dispatchEvent(new Event("input", { bubbles: true }))
    passwordRef.current.dispatchEvent(new Event("input", { bubbles: true }))
  }

  return (
    <div className="w-full flex flex-col" data-testid="login-page">
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-3">
          <Input
            ref={emailRef}
            label={t("email")}
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            ref={passwordRef}
            label={t("password")}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-5">
          {t("signIn")}
        </SubmitButton>
      </form>
      <p
        className="text-center text-sm mt-5"
        style={{ color: "var(--text-dim)" }}
      >
        {t("notMember")}{" "}
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="font-medium transition-colors"
          style={{ color: "var(--teal)" }}
          data-testid="register-button"
        >
          {t("joinUs")}
        </button>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div
          className="mt-4 rounded-xl border p-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-dim)" }}>
            Dev quick fill
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEV_CREDENTIALS.map((credential) => (
              <button
                key={credential.label}
                type="button"
                onClick={() => fillCredentials(credential)}
                className="rounded-lg border px-2 py-2 text-xs font-medium transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Fill {credential.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
