'use client'

import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface DeleteMySheetButtonProps {
  sheetId: string
}

export function DeleteMySheetButton({ sheetId }: DeleteMySheetButtonProps) {
  const router = useRouter()

  async function handleDelete() {
    const confirmed = window.confirm('Supprimer cette grille d\'accords ? Cette action est irréversible.')
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase.from('chord_sheets').delete().eq('id', sheetId)

    if (error) {
      alert('Erreur lors de la suppression : ' + error.message)
      return
    }

    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
      onClick={handleDelete}
    >
      <Trash2 className="w-3.5 h-3.5" />
      <span className="sr-only">Supprimer</span>
    </Button>
  )
}
