import { requireAuth } from "@/lib/auth-guard"

export default async function ContribuerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()
  return <>{children}</>
}
