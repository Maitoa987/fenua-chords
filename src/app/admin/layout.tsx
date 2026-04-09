import Link from "next/link"
import { requireAdmin } from "@/lib/admin-guard"
import { Shield } from "lucide-react"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="font-heading text-2xl text-primary">Administration</h1>
      </div>

      <nav className="flex flex-wrap gap-2 mb-8 border-b border-border pb-2">
        <Link href="/admin" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
          Dashboard
        </Link>
        <Link href="/admin/utilisateurs" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
          Utilisateurs
        </Link>
        <Link href="/admin/contenu" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
          Contenu
        </Link>
        <Link href="/admin/artistes" className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
          Artistes
        </Link>
      </nav>

      {children}
    </div>
  )
}
