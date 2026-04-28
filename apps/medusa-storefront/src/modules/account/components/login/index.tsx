import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div className="w-full flex flex-col" data-testid="login-page">
      <h1
        className="font-syne text-2xl font-black mb-2"
        style={{ color: "var(--text)" }}
      >
        Welcome back
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
        Sign in to access an enhanced shopping experience.
      </p>
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-3">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-5">
          Sign in
        </SubmitButton>
      </form>
      <p
        className="text-center text-sm mt-5"
        style={{ color: "var(--text-dim)" }}
      >
        Not a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="font-medium transition-colors"
          style={{ color: "var(--teal)" }}
          data-testid="register-button"
        >
          Join us
        </button>
      </p>
    </div>
  )
}

export default Login
