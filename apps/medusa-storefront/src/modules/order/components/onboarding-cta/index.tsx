"use client"

import { resetOnboardingState } from "@lib/data/onboarding"
import { useUiLocale } from "@lib/context/ui-locale-context"
import { getAccountCopy } from "@modules/account/account-copy"
import { Button, Container, Text } from "@medusajs/ui"

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  const locale = useUiLocale()
  const t = (key: Parameters<typeof getAccountCopy>[1]) =>
    getAccountCopy(locale, key)

  return (
    <Container className="max-w-4xl h-full bg-ui-bg-subtle w-full">
      <div className="flex flex-col gap-y-4 center p-4 md:items-center">
        <Text className="text-ui-fg-base text-xl">
          {t("orderConfirmedOnboardingTitle")}
        </Text>
        <Text className="text-ui-fg-subtle text-small-regular">
          {t("orderConfirmedOnboardingDescription")}
        </Text>
        <Button
          className="w-fit"
          size="xlarge"
          onClick={() => resetOnboardingState(orderId)}
        >
          {t("orderConfirmedOnboardingCta")}
        </Button>
      </div>
    </Container>
  )
}

export default OnboardingCta
