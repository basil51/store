"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getAccountCopy } from "@modules/account/account-copy"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) => getAccountCopy(locale, key)

  return (
    <div className="w-full flex flex-col" data-testid="register-page">
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("firstName")}
              name="first_name"
              required
              autoComplete="given-name"
              data-testid="first-name-input"
            />
            <Input
              label={t("lastName")}
              name="last_name"
              required
              autoComplete="family-name"
              data-testid="last-name-input"
            />
          </div>
          <Input
            label={t("email")}
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label={t("phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label={t("password")}
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="register-error" />
        <p
          className="text-center text-xs mt-5 leading-relaxed"
          style={{ color: "var(--text-dim)" }}
        >
          {t("byCreatingAccount")}{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="transition-colors"
            style={{ color: "var(--teal)" }}
          >
            {t("privacyPolicy")}
          </LocalizedClientLink>{" "}
          {t("and")}{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="transition-colors"
            style={{ color: "var(--teal)" }}
          >
            {t("termsOfUse")}
          </LocalizedClientLink>
          .
        </p>
        <SubmitButton className="w-full mt-4" data-testid="register-button">
          {t("createAccount")}
        </SubmitButton>
      </form>
      <p
        className="text-center text-sm mt-5"
        style={{ color: "var(--text-dim)" }}
      >
        {t("alreadyMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="font-medium transition-colors"
          style={{ color: "var(--teal)" }}
        >
          {t("signIn")}
        </button>
      </p>
    </div>
  )
}

export default Register
