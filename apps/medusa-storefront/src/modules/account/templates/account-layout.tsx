import React from "react"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({ customer, children }) => {
  if (!customer) {
    return (
      <div className="flex-1" data-testid="account-page">
        {children}
      </div>
    )
  }

  return (
    <div className="flex-1 py-8 small:py-12" data-testid="account-page">
      <div className="content-container mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-6 small:grid-cols-[220px_1fr]">
          <aside>
            <AccountNav customer={customer} />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
