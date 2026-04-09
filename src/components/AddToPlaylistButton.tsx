'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ListPlus, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface AddToPlaylistButtonProps {
  songId: string
  songTitle: string
  variant?: 'default' | 'icon'
}

export function AddToPlaylistButton({ songId, songTitle, variant = 'default' }: AddToPlaylistButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'added' | 'already' | 'no-playlist' | 'no-auth'>('idle')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setState('no-auth')
        return
      }

      const { data: playlist } = await supabase
        .from('playlists')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!playlist) {
        if (!cancelled) setState('no-playlist')
        return
      }

      const { data: existing } = await supabase
        .from('playlist_songs')
        .select('id')
        .eq('playlist_id', playlist.id)
        .eq('song_id', songId)
        .single()

      if (!cancelled) setState(existing ? 'already' : 'idle')
    }

    check()
    return () => { cancelled = true }
  }, [songId])

  async function handleAdd() {
    setState('loading')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: playlist } = await supabase
      .from('playlists')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!playlist) {
      setState('no-playlist')
      return
    }

    // Get max position
    const { data: maxPos } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlist.id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPos?.position ?? -1) + 1

    const { error } = await supabase.from('playlist_songs').insert({
      playlist_id: playlist.id,
      song_id: songId,
      position: nextPosition,
    })

    if (!error) {
      setState('added')
    }
  }

  if (state === 'no-auth') {
    return variant === 'icon' ? null : (
      <Button variant="outline" size="sm" onClick={() => router.push('/connexion')} title="Connecte-toi pour ajouter à ta playlist">
        <ListPlus className="w-4 h-4 mr-1" />
        Playlist
      </Button>
    )
  }

  if (state === 'no-playlist') {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push('/playlists')} title="Crée ta playlist d'abord">
        <ListPlus className="w-4 h-4 mr-1" />
        {variant === 'icon' ? null : 'Créer ma playlist'}
      </Button>
    )
  }

  if (state === 'already' || state === 'added') {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-60">
        <Check className="w-4 h-4 mr-1" />
        {variant === 'icon' ? null : 'Ajouté'}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAdd}
      disabled={state === 'loading'}
      title={`Ajouter "${songTitle}" à ma playlist`}
    >
      {state === 'loading' ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : (
        <ListPlus className="w-4 h-4 mr-1" />
      )}
      {variant === 'icon' ? null : 'Playlist'}
    </Button>
  )
}
