import { z } from "zod"

const artistSchema = z.object({
  id: z.union([
    z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Identifiant artiste invalide"),
    z.null(),
  ]),
  name: z.string().trim().min(1, "Le nom d'artiste est requis").max(100, "Le nom d'artiste ne peut pas depasser 100 caracteres"),
})

export const songSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200, "Le titre ne peut pas depasser 200 caracteres"),
  artists: z.array(artistSchema).min(1, "Au moins un artiste est requis"),
  style: z.enum(["bringue", "himene", "variete", "traditionnel", "autre"]),
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  originalKey: z.string().max(10).regex(/^([A-G][#b]?m?[0-9]?)?$/, "Tonalite invalide").or(z.literal("")),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).optional().default(""),
  content: z.string().trim().min(1, "Le contenu des accords est requis").max(50000, "Le contenu ne peut pas depasser 50 000 caracteres"),
})

export const editSheetSchema = z.object({
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).optional().default(""),
  content: z.string().trim().min(1, "Le contenu des accords est requis").max(50000, "Le contenu ne peut pas depasser 50 000 caracteres"),
})

export type SongInput = z.infer<typeof songSchema>
export type EditSheetInput = z.infer<typeof editSheetSchema>
