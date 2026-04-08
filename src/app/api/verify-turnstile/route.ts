import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // If no secret key configured, skip verification (dev mode)
    return NextResponse.json({ success: true })
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      response: token,
    }),
  })

  const data = await response.json()
  return NextResponse.json({ success: data.success })
}
