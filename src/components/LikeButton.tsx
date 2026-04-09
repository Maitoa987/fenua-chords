'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface LikeButtonProps {
  songId: string
  initialLikesCount: number
  initialIsLiked: boolean
  size?: 'sm' | 'default'
}

export function LikeButton({ songId, initialLikesCount, initialIsLiked, size = 'default' }: LikeButtonProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/connexion')
      return
    }

    // Optimistic update
    const wasLiked = isLiked
    const prevCount = likesCount
    setIsLiked(!wasLiked)
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1)
    setLoading(true)

    if (wasLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('song_id', songId)

      if (error) {
        setIsLiked(wasLiked)
        setLikesCount(prevCount)
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, song_id: songId })

      if (error) {
        setIsLiked(wasLiked)
        setLikesCount(prevCount)
      }
    }

    setLoading(false)
  }

  const isCompact = size === 'sm'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggle() }}
      disabled={loading}
      className={`gap-1 ${isCompact ? 'h-7 px-1.5' : 'h-8 px-2'}`}
      title={isLiked ? 'Retirer le like' : 'Liker ce chant'}
    >
      <Heart
        className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-colors ${
          isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
        }`}
      />
      <span className={`${isCompact ? 'text-xs' : 'text-sm'} tabular-nums text-muted-foreground`}>
        {likesCount}
      </span>
    </Button>
  )
}
