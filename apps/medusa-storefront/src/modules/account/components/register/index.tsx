"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)

  return (
    <div className="w-full flex flex-col" data-testid="register-page">
      <h1
        className="font-syne text-2xl font-black mb-2"
        style={{ color: "var(--text)" }}
      >
        Create account
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
        Create your profile and get access to an enhanced shopping experience.
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              name="first_name"
              required
              autoComplete="given-name"
              data-testid="first-name-input"
            />
            <Input
              label="Last name"
              name="last_name"
              required
              autoComplete="family-name"
              data-testid="last-name-input"
            />
          </div>
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="Password"
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
          By creating an account, you agree to our{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="transition-colors"
            style={{ color: "var(--teal)" }}
          >
            Privacy Policy
          </LocalizedClientLink>{" "}
          and{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="transition-colors"
            style={{ color: "var(--teal)" }}
          >
            Terms of Use
          </LocalizedClientLink>
          .
        </p>
        <SubmitButton className="w-full mt-4" data-testid="register-button">
          Create account
        </SubmitButton>
      </form>
      <p
        className="text-center text-sm mt-5"
        style={{ color: "var(--text-dim)" }}
      >
        Already a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="font-medium transition-colors"
          style={{ color: "var(--teal)" }}
        >
          Sign in
        </button>
      </p>
    </div>
  )
}

export default Register
