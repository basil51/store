"use client"

import React from "react"

import { applyPromotions } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")

  const { promotions = [] } = cart
  const removePromotionCode = async (code: string) => {
    const validPromotions = promotions.filter(
      (promotion) => promotion.code !== code
    )

    await applyPromotions(
      validPromotions.filter((p) => p.code !== undefined).map((p) => p.code!)
    )
  }

  const addPromotionCode = async (formData: FormData) => {
    setErrorMessage("")

    const code = formData.get("code")
    if (!code) {
      return
    }
    const input = document.getElementById("promotion-input") as HTMLInputElement
    const codes = promotions
      .filter((p) => p.code !== undefined)
      .map((p) => p.code!)
    codes.push(code.toString())

    try {
      await applyPromotions(codes)
    } catch (e: any) {
      setErrorMessage(e.message)
    }

    if (input) {
      input.value = ""
    }
  }

  return (
    <div className="w-full flex flex-col">
      <div>
        <form action={(a) => addPromotionCode(a)} className="w-full mb-4">
          <div className="flex gap-x-1 mb-2 items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="text-sm font-medium transition-colors"
              style={{ color: "var(--teal)" }}
              data-testid="add-discount-button"
            >
              {isOpen ? "− Hide" : "+ Add Promotion Code(s)"}
            </button>
          </div>

          {isOpen && (
            <>
              <div className="flex w-full gap-x-2">
                <input
                  className="flex-1 h-10 px-3 rounded-xl text-sm appearance-none focus:outline-none transition-all"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                  id="promotion-input"
                  name="code"
                  type="text"
                  autoFocus={false}
                  placeholder="Promo code"
                  data-testid="discount-input"
                />
                <SubmitButton
                  variant="secondary"
                  data-testid="discount-apply-button"
                >
                  Apply
                </SubmitButton>
              </div>

              <ErrorMessage
                error={errorMessage}
                data-testid="discount-error-message"
              />
            </>
          )}
        </form>

        {promotions.length > 0 && (
          <div className="w-full flex items-center">
            <div className="flex flex-col w-full gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Promotions applied:</p>

              {promotions.map((promotion) => (
                <div
                  key={promotion.id}
                  className="flex items-center justify-between w-full max-w-full"
                  data-testid="discount-row"
                >
                  <span
                    className="flex gap-x-1 items-baseline text-sm w-4/5"
                    style={{
                      color: "var(--text-dim)",
                      paddingInlineEnd: "0.25rem",
                    }}
                  >
                    <span className="truncate" data-testid="discount-code">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{
                          background: promotion.is_automatic ? "rgba(0,229,200,0.15)" : "rgba(255,203,71,0.15)",
                          color: promotion.is_automatic ? "var(--teal)" : "var(--amber)",
                          marginInlineEnd: "0.25rem",
                        }}
                      >
                        {promotion.code}
                      </span>
                      ({promotion.application_method?.value !== undefined &&
                        promotion.application_method.currency_code !== undefined && (
                          <>
                            {promotion.application_method.type === "percentage"
                              ? `${promotion.application_method.value}%`
                              : convertToLocale({
                                  amount: +promotion.application_method.value,
                                  currency_code: promotion.application_method.currency_code,
                                })}
                          </>
                        )})
                    </span>
                  </span>
                  {!promotion.is_automatic && (
                    <button
                      className="flex items-center transition-colors"
                      style={{ color: "var(--coral)" }}
                      onClick={() => {
                        if (!promotion.code) return
                        removePromotionCode(promotion.code)
                      }}
                      data-testid="remove-discount-button"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default DiscountCode
