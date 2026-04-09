'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Copy, Check, Globe, Link2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import type { Visibility } from '@/types/database'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  playlistId: string
  shareToken: string
  visibility: Visibility
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe; description: string }[] = [
  { value: 'private', label: 'Privée', icon: Lock, description: 'Visible uniquement par toi' },
  { value: 'link', label: 'Lien direct', icon: Link2, description: 'Accessible via le lien ou QR code' },
  { value: 'public', label: 'Publique', icon: Globe, description: 'Visible par tout le monde' },
]

export function PlaylistShareModal({ open, onOpenChange, playlistId, shareToken, visibility: initialVisibility }: Props) {
  const router = useRouter()
  const [visibility, setVisibility] = useState(initialVisibility)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/playlists/${shareToken}`
    : `/playlists/${shareToken}`

  const canShare = visibility !== 'private'

  async function handleVisibilityChange(v: Visibility) {
    setVisibility(v)
    const supabase = createClient()
    await supabase.from('playlists').update({ visibility: v }).eq('id', playlistId)
    router.refresh()
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadQR() {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = 512
      canvas.height = 512
      ctx?.drawImage(img, 0, 0, 512, 512)
      const a = document.createElement('a')
      a.download = `playlist-${shareToken}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager ma playlist</DialogTitle>
        </DialogHeader>

        {/* Visibility selector */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Visibilité</p>
          <div className="grid gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => handleVisibilityChange(opt.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    visibility === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* QR Code & Link */}
        {canShare ? (
          <div className="space-y-4 mt-4">
            <div ref={qrRef} className="flex justify-center">
              <div className="w-full max-w-[200px] mx-auto">
                <QRCodeSVG value={shareUrl} size={200} level="M" className="w-full h-auto" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copié !' : 'Copier le lien'}
              </Button>
              <Button variant="outline" onClick={handleDownloadQR}>
                <Download className="w-4 h-4 mr-1" />
                QR PNG
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Passe ta playlist en <strong>Lien direct</strong> ou <strong>Publique</strong> pour la partager.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
