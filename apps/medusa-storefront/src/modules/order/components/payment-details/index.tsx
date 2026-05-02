import { isManual, isStripeLike, paymentInfoMap } from "@lib/constants"
import Divider from "@modules/common/components/divider"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0].payments?.[0]

  return (
    <div>
      <h3
        className="font-syne text-lg font-black mb-4"
        style={{ color: "var(--text)" }}
      >
        Payment
      </h3>
      <div>
        {payment && (
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-y-1 min-w-[160px]">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>
                Payment method
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--text)" }}
                data-testid="payment-method"
              >
                {paymentInfoMap[payment.provider_id].title}
              </p>
            </div>
            <div className="flex flex-col gap-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--teal)" }}>
                Payment details
              </p>
              <div className="flex gap-2 items-center">
                <span
                  className="flex items-center justify-center h-7 w-7 rounded-lg"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  {paymentInfoMap[payment.provider_id].icon}
                </span>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-dim)" }}
                  data-testid="payment-amount"
                >
                  {isStripeLike(payment.provider_id) && payment.data?.card_last4
                    ? `**** **** **** ${payment.data.card_last4}`
                    : isManual(payment.provider_id)
                    ? "No online payment captured. Collect payment offline after order confirmation."
                    : `${convertToLocale({
                        amount: payment.amount,
                        currency_code: order.currency_code,
                      })} paid at ${new Date(
                        payment.created_at ?? ""
                      ).toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Divider className="mt-6" />
    </div>
  )
}

export default PaymentDetails
