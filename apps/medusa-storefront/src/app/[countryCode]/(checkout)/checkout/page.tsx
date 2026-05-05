import { retrieveCart } from "@lib/data/cart"
import { getStorefrontSettings } from "@lib/data/currency"
import { retrieveCustomer } from "@lib/data/customer"
import { getLocale } from "@lib/data/locale-actions"
import { getUiCopy } from "@lib/ui-copy"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

type CheckoutStep = "address" | "delivery" | "payment" | "review"

const CHECKOUT_STEP_SET = new Set<CheckoutStep>([
  "address",
  "delivery",
  "payment",
  "review",
])

const getRequestedStep = (value?: string | string[]): CheckoutStep | null => {
  if (Array.isArray(value)) {
    return null
  }

  return CHECKOUT_STEP_SET.has(value as CheckoutStep)
    ? (value as CheckoutStep)
    : null
}

const isStepAllowed = ({
  step,
  hasAddressStep,
  hasDeliveryStep,
  hasPaymentStep,
}: {
  step: CheckoutStep
  hasAddressStep: boolean
  hasDeliveryStep: boolean
  hasPaymentStep: boolean
}) => {
  if (step === "address") {
    return true
  }

  if (step === "delivery") {
    return hasAddressStep
  }

  if (step === "payment") {
    return hasAddressStep && hasDeliveryStep
  }

  return hasAddressStep && hasDeliveryStep && hasPaymentStep
}

const getFirstRequiredStep = ({
  hasAddressStep,
  hasDeliveryStep,
  hasPaymentStep,
}: {
  hasAddressStep: boolean
  hasDeliveryStep: boolean
  hasPaymentStep: boolean
}): CheckoutStep => {
  if (!hasAddressStep) {
    return "address"
  }

  if (!hasDeliveryStep) {
    return "delivery"
  }

  if (!hasPaymentStep) {
    return "payment"
  }

  return "review"
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()

  return {
    title: getUiCopy(locale, "metaCheckoutTitle"),
    description: getUiCopy(locale, "metaCheckoutDescription"),
  }
}

type CheckoutPageProps = {
  params: Promise<{
    countryCode: string
  }>
  searchParams: Promise<{
    step?: string | string[]
    [key: string]: string | string[] | undefined
  }>
}

export default async function Checkout(props: CheckoutPageProps) {
  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])

  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0
  const activePaymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session: any) => session.status === "pending"
  )

  const hasAddressStep =
    !!cart?.shipping_address && !!cart?.billing_address && !!cart?.email
  const hasDeliveryStep = (cart?.shipping_methods?.length ?? 0) > 0
  const hasPaymentStep = paidByGiftcard || !!activePaymentSession

  const firstRequiredStep = getFirstRequiredStep({
    hasAddressStep,
    hasDeliveryStep,
    hasPaymentStep,
  })

  const requestedStep = getRequestedStep(searchParams.step)
  const shouldRedirect =
    !requestedStep ||
    !isStepAllowed({
      step: requestedStep,
      hasAddressStep,
      hasDeliveryStep,
      hasPaymentStep,
    })

  if (shouldRedirect) {
    const redirectParams = new URLSearchParams()

    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "step" || value === undefined) {
        continue
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          redirectParams.append(key, item)
        }
        continue
      }

      redirectParams.set(key, value)
    }

    redirectParams.set("step", firstRequiredStep)

    redirect(`/${params.countryCode}/checkout?${redirectParams.toString()}`)
  }

  const customer = await retrieveCustomer()
  const storeSettings = await getStorefrontSettings()

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_380px] content-container gap-8 py-12">
      <PaymentWrapper cart={cart}>
        <CheckoutForm
          cart={cart}
          customer={customer}
          storeSettings={storeSettings}
        />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} storeSettings={storeSettings} />
    </div>
  )
}
