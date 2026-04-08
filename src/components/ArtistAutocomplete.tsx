"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { XIcon } from "lucide-react"

export interface ArtistValue {
  id: string | null
  name: string
}

interface ArtistAutocompleteProps {
  value: ArtistValue | null
  onChange: (value: ArtistValue | null) => void
}

const supabase = createClient()

export function ArtistAutocomplete({ value, onChange }: ArtistAutocompleteProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ArtistValue[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("artists")
      .select("id, name")
      .ilike("name", `%${q}%`)
      .limit(8)
    setResults((data ?? []).map((a) => ({ id: a.id as string, name: a.name as string })))
    setLoading(false)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function selectExisting(artist: ArtistValue) {
    onChange(artist)
    setQuery("")
    setOpen(false)
    setResults([])
  }

  function selectNew() {
    onChange({ id: null, name: query.trim() })
    setQuery("")
    setOpen(false)
    setResults([])
  }

  function clear() {
    onChange(null)
    setQuery("")
    setResults([])
    setOpen(false)
  }

  const showCreateOption =
    query.trim().length > 0 &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase())

  if (value) {
    return (
      <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
        {value.name}
        {value.id === null && (
          <span className="text-xs opacity-60 ml-1">(nouveau)</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={clear}
          className="ml-1 hover:opacity-70 rounded-full"
          aria-label="Supprimer l'artiste"
        >
          <XIcon />
        </Button>
      </span>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Nom de l'artiste"
        autoComplete="off"
      />

      {open && (results.length > 0 || showCreateOption || loading) && (
        <div className="absolute z-20 w-full mt-1 shadow-lg rounded-xl overflow-hidden border border-border">
          <Command shouldFilter={false}>
            <CommandList>
              {loading && (
                <CommandEmpty>Recherche...</CommandEmpty>
              )}
              {!loading && results.length === 0 && !showCreateOption && (
                <CommandEmpty>Aucun résultat.</CommandEmpty>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup>
                  {results.map((artist) => (
                    <CommandItem
                      key={artist.id}
                      value={artist.name}
                      onSelect={() => selectExisting(artist)}
                    >
                      {artist.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!loading && showCreateOption && (
                <CommandGroup>
                  <CommandItem
                    value={`__create__${query.trim()}`}
                    onSelect={selectNew}
                    className="text-primary font-medium"
                  >
                    Créer &ldquo;{query.trim()}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
