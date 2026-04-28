import { Dialog, Transition } from "@headlessui/react"
import { Button, clx } from "@medusajs/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"

import { getProductPrice } from "@lib/util/get-product-price"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import OptionSelect from "./option-select"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  handleWhatsAppOrder: () => void
  cartMode: "standard" | "whatsapp" | "both"
  showWhatsApp: boolean
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  handleWhatsAppOrder,
  cartMode,
  showWhatsApp,
  isAdding,
  show,
  optionsDisabled,
}) => {
  const { state, open, close } = useToggleState()
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("lg:hidden inset-x-0 bottom-0 fixed z-50", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="flex flex-col gap-y-3 justify-center items-center p-4 h-full w-full"
            style={{
              background: "var(--surface)",
              borderTop: "1px solid var(--border)",
            }}
            data-testid="mobile-actions"
          >
            <div className="flex items-center gap-x-2 text-sm" style={{ color: "var(--text)" }}>
              <span data-testid="mobile-title">{product.title}</span>
              <span style={{ color: "var(--text-dim)" }}>—</span>
              {selectedPrice ? (
                <div className="flex items-end gap-x-2" style={{ color: "var(--text)" }}>
                  {selectedPrice.price_type === "sale" && (
                    <p>
                      <span className="line-through text-xs" style={{ color: "var(--text-dim)" }}>
                        {selectedPrice.original_price}
                      </span>
                    </p>
                  )}
                  <span
                    className="font-semibold"
                    style={{ color: selectedPrice.price_type === "sale" ? "var(--coral)" : "var(--text)" }}
                  >
                    {selectedPrice.calculated_price}
                  </span>
                </div>
              ) : (
                <div></div>
              )}
            </div>
            <div className={clx("grid w-full gap-x-4", {
              "grid-cols-1": isSimple && (!showWhatsApp || cartMode === "whatsapp"),
              "grid-cols-2": (!isSimple && !showWhatsApp) || (isSimple && showWhatsApp && cartMode !== "whatsapp"),
              "grid-cols-3": !isSimple && showWhatsApp,
            })}>
              {!isSimple && <Button
                onClick={open}
                variant="secondary"
                className="w-full"
                data-testid="mobile-actions-button"
              >
                <div className="flex items-center justify-between w-full">
                  <span>
                    {variant
                      ? Object.values(options).join(" / ")
                      : t("mobileActionsSelectOptions")}
                  </span>
                  <ChevronDown />
                </div>
              </Button>}
              <Button
                onClick={cartMode === "whatsapp" ? handleWhatsAppOrder : handleAddToCart}
                disabled={!inStock || !variant}
                className="w-full"
                isLoading={isAdding}
                data-testid="mobile-cart-button"
              >
                {cartMode === "whatsapp"
                  ? !variant
                    ? t("commonSelectVariant")
                    : !inStock
                    ? t("commonOutOfStock")
                    : t("productActionsOrderOnWhatsApp")
                  : !variant
                  ? t("commonSelectVariant")
                  : !inStock
                  ? t("commonOutOfStock")
                  : t("commonAddToCart")}
              </Button>
              {showWhatsApp && cartMode !== "whatsapp" && (
                <Button
                  onClick={handleWhatsAppOrder}
                  disabled={!inStock || !variant}
                  className="w-full"
                  style={{ background: "#25D366", color: "#052e16" }}
                >
                  {t("productActionsOrderOnWhatsApp")}
                </Button>
              )}
            </div>
          </div>
        </Transition>
      </div>
      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-700 bg-opacity-75 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed bottom-0 inset-x-0">
            <div className="flex min-h-full h-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Panel
                  className="w-full h-full transform overflow-hidden [text-align:start] flex flex-col gap-y-3"
                  data-testid="mobile-actions-modal"
                >
                  <div className="w-full flex justify-end [padding-inline-end:1.5rem]">
                    <button
                      onClick={close}
                      className="w-12 h-12 rounded-full flex justify-center items-center"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                      data-testid="close-modal-button"
                    >
                      <X />
                    </button>
                  </div>
                  <div
                    className="px-6 py-12"
                    style={{ background: "var(--surface)" }}
                  >
                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => {
                          return (
                            <div key={option.id}>
                              <OptionSelect
                                option={option}
                                current={options[option.id]}
                                updateOption={updateOptions}
                                title={option.title ?? ""}
                                disabled={optionsDisabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
