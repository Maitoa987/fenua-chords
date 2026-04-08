"use client"

import { Turnstile } from "@marsidev/react-turnstile"

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
}

export function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  if (!siteKey) return null

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onVerify}
      options={{
        theme: "light",
        size: "flexible",
      }}
    />
  )
}
