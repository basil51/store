import { Metadata } from "next"
import { getLocale } from "@lib/data/locale-actions"
import { getAccountCopy } from "@modules/account/account-copy"

import LoginTemplate from "@modules/account/templates/login-template"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: getAccountCopy(locale, "metaSignInTitle"),
    description: getAccountCopy(locale, "metaSignInDescription"),
  }
}

export default function Login() {
  return <LoginTemplate />
}
