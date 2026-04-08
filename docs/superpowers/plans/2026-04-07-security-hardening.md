# Security Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure all forms against spam bots and invalid data with input validation (Zod), rate limiting, and Cloudflare Turnstile captcha.

**Architecture:** Zod schemas validate all user input before DB writes. Rate limiting via Supabase RPC function counts recent inserts per user. Turnstile captcha protects signup and contribute forms. All validation happens both client-side (UX) and at insert time (security).

**Tech Stack:** Zod, Cloudflare Turnstile (@marsidev/react-turnstile), Next.js Server Actions, Supabase RPC.

---

## Task 1: Install Zod + create validation schemas

**Files:**
- Create: `src/lib/validation.ts`

- [ ] **Step 1: Install Zod**

```bash
npm install zod
```

- [ ] **Step 2: Create validation schemas**

```tsx
// src/lib/validation.ts
import { z } from "zod"

export const songSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Le titre est requis")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),
  artistName: z
    .string()
    .trim()
    .min(1, "L'artiste est requis")
    .max(100, "Le nom d'artiste ne peut pas dépasser 100 caractères"),
  artistId: z.string().uuid().nullable(),
  style: z.enum(["bringue", "himene", "variete", "traditionnel", "autre"]),
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  originalKey: z
    .string()
    .max(10)
    .regex(/^[A-Ga-g]?[#b]?m?[0-9]?$/, "Tonalité invalide")
    .or(z.literal("")),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).optional().default(""),
  content: z
    .string()
    .trim()
    .min(1, "Le contenu des accords est requis")
    .max(50000, "Le contenu ne peut pas dépasser 50 000 caractères"),
})

export const editSheetSchema = z.object({
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).optional().default(""),
  content: z
    .string()
    .trim()
    .min(1, "Le contenu des accords est requis")
    .max(50000, "Le contenu ne peut pas dépasser 50 000 caractères"),
})

export const youtubeUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        return ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"].includes(parsed.hostname)
      } catch {
        return false
      }
    },
    "L'URL doit être un lien YouTube valide"
  )
  .or(z.literal(""))
  .optional()

export type SongInput = z.infer<typeof songSchema>
export type EditSheetInput = z.infer<typeof editSheetSchema>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation.ts package.json package-lock.json
git commit -m "feat: add Zod validation schemas for song and chord sheet forms"
```

---

## Task 2: Apply Zod validation to Contribute page

**Files:**
- Modify: `src/app/contribuer/page.tsx`

- [ ] **Step 1: Add Zod validation in handleSubmit**

Read current `src/app/contribuer/page.tsx`. Add validation before the Supabase calls. Key changes:

1. Import `songSchema` from `@/lib/validation`
2. At the start of `handleSubmit`, parse the form data:

```tsx
import { songSchema } from "@/lib/validation"

// Inside handleSubmit, before any Supabase call:
const parsed = songSchema.safeParse({
  title: formData.title,
  artistName: formData.artist?.name ?? "",
  artistId: formData.artist?.id ?? null,
  style: formData.style,
  instrument: formData.instrument,
  originalKey: formData.originalKey,
  capo: formData.capo,
  tuning: formData.tuning,
  content,
})

if (!parsed.success) {
  setError(parsed.error.errors[0].message)
  setLoading(false)
  return
}
```

3. Use `parsed.data` for all subsequent operations instead of raw `formData`:
   - `parsed.data.title` instead of `formData.title`
   - `parsed.data.content` instead of `content`
   - etc.

4. Also trim title and artist name before slug generation and DB insert.

- [ ] **Step 2: Handle slug collision gracefully**

After the song insert, catch unique constraint errors and append a counter:

```tsx
let songSlug = slugify(`${parsed.data.artistName}-${parsed.data.title}`)

let song = null
let songError = null

// Try with base slug, then with counter
for (let attempt = 0; attempt < 5; attempt++) {
  const trySlug = attempt === 0 ? songSlug : `${songSlug}-${attempt}`
  const result = await supabase
    .from("songs")
    .insert({
      title: parsed.data.title,
      slug: trySlug,
      artist_id: artistId,
      style: parsed.data.style,
      original_key: parsed.data.originalKey || null,
      created_by: user.id,
      status: "published",
    })
    .select("id, slug")
    .single()

  if (!result.error) {
    song = result.data
    break
  }
  if (!result.error.message.includes("unique") && !result.error.message.includes("duplicate")) {
    songError = result.error
    break
  }
}

if (!song) {
  throw new Error(songError?.message ?? "Impossible de créer la chanson (slug en conflit)")
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/contribuer/page.tsx
git commit -m "feat: add Zod validation + slug collision handling on contribute page"
```

---

## Task 3: Apply Zod validation to Edit page

**Files:**
- Modify: `src/app/contribuer/[id]/edit/page.tsx`

- [ ] **Step 1: Add Zod validation in handleSave**

Import `editSheetSchema` and validate before update:

```tsx
import { editSheetSchema } from "@/lib/validation"

// Inside handleSave:
const parsed = editSheetSchema.safeParse({
  instrument,
  capo,
  tuning,
  content,
})

if (!parsed.success) {
  setError(parsed.error.errors[0].message)
  setSaving(false)
  return
}

// Use parsed.data for the update
const { error: updateError } = await supabase
  .from("chord_sheets")
  .update({
    instrument: parsed.data.instrument,
    capo: parsed.data.capo || null,
    tuning: parsed.data.tuning || null,
    content: parsed.data.content,
  })
  .eq("id", id)
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/contribuer/\[id\]/edit/page.tsx
git commit -m "feat: add Zod validation on edit chord sheet page"
```

---

## Task 4: Rate limiting via Supabase RPC

**Files:**
- Create: `supabase/migrations/004_rate_limit.sql`
- Modify: `src/app/contribuer/page.tsx`

- [ ] **Step 1: Create rate limit SQL function**

```sql
-- supabase/migrations/004_rate_limit.sql

-- Count recent songs created by a user in the last hour
create or replace function public.check_rate_limit(user_uuid uuid, max_per_hour int default 10)
returns boolean as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from songs
  where created_by = user_uuid
    and created_at > now() - interval '1 hour';

  return recent_count < max_per_hour;
end;
$$ language plpgsql security definer;
```

Run this in Supabase SQL Editor.

- [ ] **Step 2: Add rate limit check in contribute page**

In `handleSubmit`, after auth check and before creating anything:

```tsx
// Check rate limit
const { data: canProceed } = await supabase.rpc("check_rate_limit", {
  user_uuid: user.id,
  max_per_hour: 10,
})

if (!canProceed) {
  setError("Tu as atteint la limite de contributions (10/heure). Réessaie plus tard.")
  setLoading(false)
  return
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_rate_limit.sql src/app/contribuer/page.tsx
git commit -m "feat: add rate limiting (10 songs/hour/user) via Supabase RPC"
```

---

## Task 5: Cloudflare Turnstile captcha

**Files:**
- Create: `src/components/TurnstileWidget.tsx`
- Modify: `src/app/connexion/page.tsx`
- Modify: `src/app/contribuer/page.tsx`
- Create: `src/app/api/verify-turnstile/route.ts`

- [ ] **Step 1: Install Turnstile React package**

```bash
npm install @marsidev/react-turnstile
```

- [ ] **Step 2: Add env variables**

Add to `.env.local`:
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key
```

User action: create a Turnstile widget at https://dash.cloudflare.com/ → Turnstile → Add Site. Use "Managed" challenge type. Get site key + secret key.

- [ ] **Step 3: Create verification API route**

```tsx
// src/app/api/verify-turnstile/route.ts
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ success: false }, { status: 400 })
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  })

  const data = await response.json()
  return NextResponse.json({ success: data.success })
}
```

- [ ] **Step 4: Create TurnstileWidget component**

```tsx
// src/components/TurnstileWidget.tsx
"use client"

import { Turnstile } from "@marsidev/react-turnstile"

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
}

export function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  if (!siteKey) return null

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onVerify}
      options={{
        theme: "light",
        size: "flexible",
      }}
    />
  )
}
```

- [ ] **Step 5: Add Turnstile to signup page**

In `src/app/connexion/page.tsx`:
1. Add state: `const [turnstileToken, setTurnstileToken] = useState<string | null>(null)`
2. Import `TurnstileWidget`
3. Add widget before submit button (only in signup mode):
```tsx
{mode === "signup" && (
  <TurnstileWidget onVerify={setTurnstileToken} />
)}
```
4. In handleSubmit, for signup mode, verify token server-side before calling Supabase:
```tsx
if (mode === "signup") {
  if (!turnstileToken) {
    setError("Veuillez compléter la vérification")
    setLoading(false)
    return
  }
  const verifyRes = await fetch("/api/verify-turnstile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: turnstileToken }),
  })
  const { success } = await verifyRes.json()
  if (!success) {
    setError("Vérification échouée. Réessayez.")
    setLoading(false)
    return
  }
}
```

- [ ] **Step 6: Add Turnstile to contribute page**

In `src/app/contribuer/page.tsx`:
1. Add state: `const [turnstileToken, setTurnstileToken] = useState<string | null>(null)`
2. Add widget before submit button
3. Verify token in handleSubmit before any DB operation
4. Update `canSubmit` to include `!!turnstileToken`

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/components/TurnstileWidget.tsx src/app/api/verify-turnstile/route.ts src/app/connexion/page.tsx src/app/contribuer/page.tsx package.json package-lock.json .env.local
git commit -m "feat: add Cloudflare Turnstile captcha on signup and contribute"
```

Note: `.env.local` should NOT be committed — make sure it's in `.gitignore`. Only commit the code files.

---

## Task 6: Input normalization + error message cleanup

**Files:**
- Modify: `src/app/contribuer/page.tsx`
- Modify: `src/app/contribuer/[id]/edit/page.tsx`
- Modify: `src/app/connexion/page.tsx`

- [ ] **Step 1: Normalize inputs before insert**

In contribute page, after Zod validation, trim all string fields:
```tsx
// Zod .trim() in schema already handles this, but also trim before slug:
const songSlug = slugify(`${parsed.data.artistName}-${parsed.data.title}`)
```

- [ ] **Step 2: Sanitize error messages**

Replace raw error messages with generic ones. In all three pages, change:
```tsx
// Before:
setError(err instanceof Error ? err.message : "Une erreur est survenue")

// After:
setError("Une erreur est survenue. Réessaie plus tard.")
```

For Supabase auth errors in connexion page, keep the original message (Supabase already sanitizes these for end users).

- [ ] **Step 3: Verify build + lint**

```bash
npm run build && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/contribuer/page.tsx src/app/contribuer/\[id\]/edit/page.tsx src/app/connexion/page.tsx
git commit -m "fix: normalize inputs + sanitize error messages"
```

---

## Summary

| Task | What | Protection |
|------|------|------------|
| 1 | Zod schemas | Input validation (length, format, types) |
| 2 | Validate contribute form | Blocks oversized/malformed data, handles slug collisions |
| 3 | Validate edit form | Same protections on edit |
| 4 | Rate limiting RPC | Max 10 songs/hour/user |
| 5 | Turnstile captcha | Blocks bots on signup + contribute |
| 6 | Normalization + errors | Clean data, no info leaks |
