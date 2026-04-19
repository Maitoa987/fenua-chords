import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { importOutputSchema, type ImportEntry } from "./import-types"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ Variables d'environnement manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY",
  )
  process.exit(1)
}

const includeLow = process.argv.includes("--include-low")
const jsonPath = resolve(process.cwd(), "import-output.json")

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

async function resolveUserId(): Promise<string> {
  const envUserId = process.env.IMPORT_USER_ID
  if (envUserId) return envUserId

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    throw new Error(
      "Aucun IMPORT_USER_ID fourni et aucun admin trouvé dans profiles. Définis IMPORT_USER_ID=<uuid> dans .env.local.",
    )
  }
  return data.id
}

async function resolveArtistIds(names: string[]): Promise<string[]> {
  const ids: string[] = []

  for (const name of names) {
    const artistSlug = slugify(name)

    const { data: existing } = await supabase
      .from("artists")
      .select("id")
      .eq("slug", artistSlug)
      .maybeSingle()

    if (existing) {
      ids.push(existing.id)
      continue
    }

    const { data: created, error } = await supabase
      .from("artists")
      .insert({ name, slug: artistSlug })
      .select("id")
      .single()

    if (error || !created) {
      throw new Error(
        `Impossible de créer l'artiste "${name}" : ${error?.message ?? "inconnu"}`,
      )
    }
    ids.push(created.id)
  }

  return ids
}

async function importEntry(entry: ImportEntry, userId: string): Promise<void> {
  const artistIds = await resolveArtistIds(entry.artists)

  const firstArtist = entry.artists[0]
  const baseSlug = slugify(`${firstArtist}-${entry.title}`)

  let songId: string | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const trySlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`
    const { data, error } = await supabase
      .from("songs")
      .insert({
        title: entry.title,
        slug: trySlug,
        style: entry.style,
        original_key: entry.originalKey || null,
        created_by: userId,
        status: "draft",
      })
      .select("id")
      .single()

    if (!error && data) {
      songId = data.id
      break
    }

    const msg = error?.message ?? ""
    if (!msg.includes("unique") && !msg.includes("duplicate")) {
      throw new Error(`Insertion song échouée : ${msg}`)
    }
  }

  if (!songId) {
    throw new Error("Impossible de générer un slug unique après 5 tentatives")
  }

  const { error: linkError } = await supabase
    .from("song_artists")
    .insert(artistIds.map((artistId) => ({ song_id: songId, artist_id: artistId })))

  if (linkError) {
    throw new Error(`Liaison artistes échouée : ${linkError.message}`)
  }

  const { error: sheetError } = await supabase.from("chord_sheets").insert({
    song_id: songId,
    instrument: entry.instrument,
    tuning: entry.tuning || null,
    capo: entry.capo || null,
    content: entry.content,
    contributed_by: userId,
  })

  if (sheetError) {
    throw new Error(`Création chord_sheet échouée : ${sheetError.message}`)
  }
}

async function main() {
  const raw = readFileSync(jsonPath, "utf-8")
  const parsed = importOutputSchema.safeParse(JSON.parse(raw))

  if (!parsed.success) {
    console.error("❌ import-output.json invalide :")
    console.error(parsed.error.issues)
    process.exit(1)
  }

  const userId = await resolveUserId()

  const entries = parsed.data
  const toImport = includeLow
    ? entries
    : entries.filter((e) => e.confidence !== "low")
  const skipped = entries.length - toImport.length

  console.log(`📦 ${entries.length} entrées trouvées`)
  console.log(`⚠  ${skipped} "low confidence" ignorées${includeLow ? " (incluses via --include-low)" : ""}`)
  console.log(`🚀 ${toImport.length} à importer (user: ${userId})\n`)

  let successCount = 0
  let errorCount = 0

  for (const entry of toImport) {
    try {
      await importEntry(entry, userId)
      successCount++
      console.log(`  ✓ ${entry.title} — ${entry.artists.join(", ")}`)
    } catch (err) {
      errorCount++
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ ${entry.title} : ${msg}`)
    }
  }

  console.log(
    `\n✓ ${successCount} importées | ✗ ${errorCount} erreurs | ⚠ ${skipped} ignorées (low)`,
  )
}

main().catch((err) => {
  console.error("❌ Erreur fatale :", err instanceof Error ? err.message : err)
  process.exit(1)
})
