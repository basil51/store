import { getStorefrontSettings } from "@lib/data/currency"
import { getLocale } from "@lib/data/locale-actions"
import { normalizeUiLocale, type UiLocale } from "@lib/ui-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { Metadata } from "next"

type ContactPageCopy = {
  metaTitle: string
  metaDescription: string
  eyebrow: string
  title: string
  description: string
  emailLabel: string
  responseHint: string
  supportTitle: string
  supportDescription: string
  returnsTitle: string
  returnsDescription: string
  browseCta: string
}

const CONTACT_PAGE_COPY: Record<UiLocale, ContactPageCopy> = {
  en: {
    metaTitle: "Contact Us | NEXMART",
    metaDescription: "Reach support or start a returns request.",
    eyebrow: "Support",
    title: "Contact us",
    description:
      "Questions about an order, product advice, or a return? Send us an email and include your order number when relevant.",
    emailLabel: "Support email",
    responseHint: "We use the same inbox for support and returns so nothing gets lost between teams.",
    supportTitle: "General support",
    supportDescription:
      "Use this for product questions, order updates, payment issues, or anything that needs a direct reply.",
    returnsTitle: "Returns & exchanges",
    returnsDescription:
      "Include your order number, the item you want to return or exchange, and the reason so we can help faster.",
    browseCta: "Browse the catalog",
  },
  ar: {
    metaTitle: "اتصل بنا | NEXMART",
    metaDescription: "تواصل مع الدعم أو ابدأ طلب إرجاع.",
    eyebrow: "الدعم",
    title: "اتصل بنا",
    description:
      "للاستفسار عن الطلبات أو المنتجات أو الإرجاع، راسلنا عبر البريد الإلكتروني وأضف رقم الطلب عند الحاجة.",
    emailLabel: "بريد الدعم",
    responseHint: "نستخدم نفس البريد للدعم والإرجاع حتى لا تضيع أي متابعة بين الفرق.",
    supportTitle: "الدعم العام",
    supportDescription:
      "استخدم هذا البريد لأسئلة المنتجات، تحديثات الطلبات، مشاكل الدفع أو أي أمر يحتاج رداً مباشراً.",
    returnsTitle: "الإرجاع والاستبدال",
    returnsDescription:
      "أرسل رقم الطلب والمنتج الذي تريد إرجاعه أو استبداله وسبب الطلب حتى نساعدك بشكل أسرع.",
    browseCta: "تصفح الكتالوج",
  },
  he: {
    metaTitle: "יצירת קשר | NEXMART",
    metaDescription: "פנו לתמיכה או התחילו בקשת החזרה.",
    eyebrow: "תמיכה",
    title: "צרו קשר",
    description:
      "לשאלות על הזמנה, ייעוץ לגבי מוצר או החזרה, שלחו לנו אימייל וצרפו מספר הזמנה כשצריך.",
    emailLabel: "אימייל תמיכה",
    responseHint: "אותה תיבת דואר משמשת גם לתמיכה וגם להחזרות כדי ששום פנייה לא תלך לאיבוד.",
    supportTitle: "תמיכה כללית",
    supportDescription:
      "השתמשו בכתובת הזו לשאלות על מוצרים, עדכוני הזמנה, בעיות תשלום או כל נושא שדורש מענה ישיר.",
    returnsTitle: "החזרות והחלפות",
    returnsDescription:
      "צרפו מספר הזמנה, את הפריט שברצונכם להחזיר או להחליף, ואת הסיבה כדי שנוכל לעזור מהר יותר.",
    browseCta: "לעיון בקטלוג",
  },
}

const getContactPageCopy = (locale: string | null | undefined) => {
  return CONTACT_PAGE_COPY[normalizeUiLocale(locale)]
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const copy = getContactPageCopy(locale)

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  }
}

export default async function ContactPage() {
  const [locale, storeSettings] = await Promise.all([
    getLocale(),
    getStorefrontSettings(),
  ])

  const copy = getContactPageCopy(locale)
  const mailtoHref = `mailto:${storeSettings.contactEmail}`
  const storeName = storeSettings.storeName || "SparkCo"

  return (
    <div className="content-container py-10 small:py-14">
      <div className="grid gap-6 rounded-[28px] border border-ui-border-base bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] small:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] small:p-10">
        <div className="flex flex-col gap-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ui-fg-muted">
              {copy.eyebrow}
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ui-fg-base small:text-4xl">
                {copy.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-ui-fg-subtle">
                {copy.description}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-ui-border-base bg-ui-bg-subtle p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ui-fg-muted">
              {copy.emailLabel}
            </p>
            <a
              href={mailtoHref}
              className="mt-3 inline-flex text-2xl font-semibold tracking-[-0.03em] text-ui-fg-base transition-opacity hover:opacity-75"
            >
              {storeSettings.contactEmail}
            </a>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ui-fg-subtle">
              {copy.responseHint}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85"
            >
              {copy.browseCta}
            </LocalizedClientLink>
          </div>
        </div>

        <div className="grid gap-4">
          <section
            id="support"
            className="scroll-mt-28 rounded-[22px] border border-ui-border-base bg-[#f5f7ff] p-5"
          >
            <p className="text-sm font-medium text-ui-fg-muted">{storeName}</p>
            <h2 className="mt-2 text-xl font-semibold text-ui-fg-base">{copy.supportTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-ui-fg-subtle">
              {copy.supportDescription}
            </p>
            <a
              href={mailtoHref}
              className="mt-4 inline-flex text-sm font-semibold text-ui-fg-base underline underline-offset-4"
            >
              {storeSettings.contactEmail}
            </a>
          </section>

          <section
            id="returns"
            className="scroll-mt-28 rounded-[22px] border border-ui-border-base bg-[#fff7ed] p-5"
          >
            <p className="text-sm font-medium text-ui-fg-muted">{storeName}</p>
            <h2 className="mt-2 text-xl font-semibold text-ui-fg-base">{copy.returnsTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-ui-fg-subtle">
              {copy.returnsDescription}
            </p>
            <a
              href={mailtoHref}
              className="mt-4 inline-flex text-sm font-semibold text-ui-fg-base underline underline-offset-4"
            >
              {storeSettings.contactEmail}
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}