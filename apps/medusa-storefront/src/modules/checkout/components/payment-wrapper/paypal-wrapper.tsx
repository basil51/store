"use client"

import { HttpTypes } from "@medusajs/types"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { createContext } from "react"

type PayPalWrapperProps = {
  paymentSession: HttpTypes.StorePaymentSession
  children: React.ReactNode
}

export const PayPalContext = createContext(false)

const PayPalWrapper: React.FC<PayPalWrapperProps> = ({
  paymentSession,
  children,
}) => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  if (!clientId) {
    throw new Error(
      "PayPal client ID is missing. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID."
    )
  }

  const sessionData = paymentSession.data as Record<string, unknown> | undefined
  const currencyCode =
    typeof sessionData?.currency_code === "string"
      ? sessionData.currency_code.toUpperCase()
      : "USD"
  const intent =
    sessionData?.intent === "CAPTURE" ? "capture" : "authorize"

  return (
    <PayPalContext.Provider value={true}>
      <PayPalScriptProvider
        options={{
          clientId,
          currency: currencyCode,
          intent,
          components: "buttons",
        }}
      >
        {children}
      </PayPalScriptProvider>
    </PayPalContext.Provider>
  )
}

export default PayPalWrapper