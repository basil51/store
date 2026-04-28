"use client"

import { Dialog, Transition } from "@headlessui/react"
import { useToast } from "@lib/context/toast-context"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getUiCopy, type UiCopyKey } from "@lib/ui-copy"
import { buildWhatsAppLink, normalizeWhatsAppNumber } from "@lib/util/whatsapp"
import X from "@modules/common/icons/x"
import { Fragment, useEffect, useRef } from "react"

type WhatsAppPreviewModalProps = {
  isOpen: boolean
  close: () => void
  message: string
  phoneNumber: string
  onOpen?: () => void
  onCopy?: () => void
  onContinue?: () => void
}

export default function WhatsAppPreviewModal({
  isOpen,
  close,
  message,
  phoneNumber,
  onOpen,
  onCopy,
  onContinue,
}: WhatsAppPreviewModalProps) {
  const { toast } = useToast()
  const locale = useUiLocale()
  const t = (key: UiCopyKey, params?: Record<string, string | number>) =>
    getUiCopy(locale, key, params)
  const hasTrackedOpenRef = useRef(false)

  const normalizedPhoneNumber = normalizeWhatsAppNumber(phoneNumber)
  const hasPreviewContent = !!message.trim() && !!normalizedPhoneNumber

  useEffect(() => {
    if (!isOpen) {
      hasTrackedOpenRef.current = false
      return
    }

    if (hasTrackedOpenRef.current) {
      return
    }

    hasTrackedOpenRef.current = true
    onOpen?.()
  }, [isOpen, onOpen])

  const handleCopy = async () => {
    if (!message.trim()) {
      return
    }

    if (!navigator.clipboard?.writeText) {
      toast(t("whatsappPreviewCopyFailed"), "amber")
      return
    }

    try {
      await navigator.clipboard.writeText(message)
      onCopy?.()
      toast(t("whatsappPreviewCopied"), "teal")
    } catch {
      toast(t("whatsappPreviewCopyFailed"), "amber")
    }
  }

  const handleOpenWhatsApp = () => {
    if (!hasPreviewContent) {
      return
    }

    onContinue?.()
    window.open(
      buildWhatsAppLink(normalizedPhoneNumber, message),
      "_blank",
      "noopener,noreferrer"
    )
    close()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto px-4 py-8">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className="w-full max-w-2xl rounded-[2rem] p-6 sm:p-7"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 30px 80px rgba(0, 0, 0, 0.4)",
                }}
                data-testid="whatsapp-preview-modal"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Dialog.Title
                      className="font-syne text-2xl font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {t("whatsappPreviewTitle")}
                    </Dialog.Title>
                    <Dialog.Description
                      className="max-w-xl text-sm leading-6"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("whatsappPreviewDescription")}
                    </Dialog.Description>
                  </div>

                  <button
                    type="button"
                    onClick={close}
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                    data-testid="close-modal-button"
                  >
                    <X />
                  </button>
                </div>

                <div className="mt-6 grid gap-4">
                  <div
                    className="rounded-3xl p-4"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.2em]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("whatsappPreviewNumberLabel")}
                    </p>
                    <p
                      className="mt-2 text-sm font-semibold"
                      style={{ color: "var(--text)" }}
                      dir="ltr"
                    >
                      {normalizedPhoneNumber || phoneNumber}
                    </p>
                  </div>

                  <div
                    className="rounded-3xl p-4"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.2em]"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("whatsappPreviewMessageLabel")}
                    </p>
                    <pre
                      className="mt-3 whitespace-pre-wrap break-words rounded-[1.5rem] p-4 text-sm leading-6"
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        color: "var(--text)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
                      }}
                      dir="auto"
                      data-testid="whatsapp-preview-message"
                    >
                      {message}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="h-12 rounded-full px-5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: "var(--surface2)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                    }}
                    disabled={!message.trim()}
                    data-testid="whatsapp-preview-copy-button"
                  >
                    {t("whatsappPreviewCopy")}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="h-12 rounded-full px-5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: hasPreviewContent ? "#25D366" : "var(--surface2)",
                      color: hasPreviewContent ? "#052e16" : "var(--text-dim)",
                      border: "none",
                      boxShadow: hasPreviewContent
                        ? "0 14px 30px rgba(37, 211, 102, 0.22)"
                        : "none",
                      cursor: hasPreviewContent ? "pointer" : "not-allowed",
                    }}
                    disabled={!hasPreviewContent}
                    data-testid="whatsapp-preview-open-button"
                  >
                    {t("whatsappPreviewOpen")}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}