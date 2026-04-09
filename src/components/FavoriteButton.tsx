'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface FavoriteButtonProps {
  songId: string
  initialIsFavorited: boolean
}

export function FavoriteButton({ songId, initialIsFavorited }: FavoriteButtonProps) {
  const router = useRouter()
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/connexion')
      return
    }

    // Optimistic update
    const wasFavorited = isFavorited
    setIsFavorited(!wasFavorited)
    setLoading(true)

    if (wasFavorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('song_id', songId)

      if (error) {
        setIsFavorited(wasFavorited)
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, song_id: songId })

      if (error) {
        setIsFavorited(wasFavorited)
      }
    }

    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      title={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Bookmark
        className={`w-4 h-4 mr-1 transition-colors ${
          isFavorited ? 'fill-primary text-primary' : ''
        }`}
      />
      {isFavorited ? 'Sauvegardé' : 'Sauvegarder'}
    </Button>
  )
}
