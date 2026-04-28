import ChevronDown from "@modules/common/icons/chevron-down"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  return (
    <div data-testid="overview-page-wrapper">
      {/* Header */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h1
          className="font-syne text-2xl font-black mb-1"
          style={{ color: "var(--text)" }}
          data-testid="welcome-message"
          data-value={customer?.first_name}
        >
          Hello, {customer?.first_name}!
        </h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Signed in as:{" "}
          <span
            className="font-medium"
            data-testid="customer-email"
            data-value={customer?.email}
            style={{ color: "var(--teal)" }}
          >
            {customer?.email}
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--text-dim)" }}
          >
            Profile Completion
          </p>
          <div className="flex items-end gap-2">
            <span
              className="font-syne text-4xl font-black leading-none"
              style={{ color: "var(--teal)" }}
              data-testid="customer-profile-completion"
              data-value={getProfileCompletion(customer)}
            >
              {getProfileCompletion(customer)}%
            </span>
            <span className="text-xs pb-1" style={{ color: "var(--text-dim)" }}>completed</span>
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--text-dim)" }}
          >
            Saved Addresses
          </p>
          <div className="flex items-end gap-2">
            <span
              className="font-syne text-4xl font-black leading-none"
              style={{ color: "var(--teal)" }}
              data-testid="addresses-count"
              data-value={customer?.addresses?.length || 0}
            >
              {customer?.addresses?.length || 0}
            </span>
            <span className="text-xs pb-1" style={{ color: "var(--text-dim)" }}>saved</span>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2
          className="font-syne text-lg font-bold mb-4"
          style={{ color: "var(--text)" }}
        >
          Recent Orders
        </h2>
        <ul className="flex flex-col gap-3" data-testid="orders-wrapper">
          {orders && orders.length > 0 ? (
            orders.slice(0, 5).map((order) => (
              <li
                key={order.id}
                data-testid="order-wrapper"
                data-value={order.id}
              >
                <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-[rgba(0,229,200,0.04)]"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                    data-testid="open-order-button"
                  >
                    <div className="grid grid-cols-3 gap-x-4 text-sm flex-1">
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: "var(--text-dim)" }}>Date placed</p>
                        <p style={{ color: "var(--text)" }} data-testid="order-created-date">
                          {new Date(order.created_at).toDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: "var(--text-dim)" }}>Order number</p>
                        <p
                          className="font-mono"
                          style={{ color: "var(--teal)" }}
                          data-testid="order-id"
                          data-value={order.display_id}
                        >
                          #{order.display_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: "var(--text-dim)" }}>Total</p>
                        <p className="font-semibold" style={{ color: "var(--text)" }} data-testid="order-amount">
                          {convertToLocale({
                            amount: order.total,
                            currency_code: order.currency_code,
                          })}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="-rotate-90 shrink-0" style={{ color: "var(--text-dim)" }} />
                  </div>
                </LocalizedClientLink>
              </li>
            ))
          ) : (
            <p
              className="py-8 text-center text-sm"
              style={{ color: "var(--text-dim)" }}
              data-testid="no-orders-message"
            >
              No recent orders
            </p>
          )}
        </ul>
      </div>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview
