import { z } from "zod"

export const songSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200, "Le titre ne peut pas dépasser 200 caractères"),
  artistName: z.string().trim().min(1, "L'artiste est requis").max(100, "Le nom d'artiste ne peut pas dépasser 100 caractères"),
  artistId: z.union([z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Identifiant artiste invalide"), z.literal(""), z.null()]).transform((v) => v === "" ? null : v),
  style: z.enum(["bringue", "himene", "variete", "traditionnel", "autre"]),
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  originalKey: z.string().max(10).regex(/^([A-G][#b]?m?[0-9]?)?$/, "Tonalité invalide").or(z.literal("")),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).optional().default(""),
  content: z.string().trim().min(1, "Le contenu des accords est requis").max(50000, "Le contenu ne peut pas dépasser 50 000 caractères"),
})

export const editSheetSchema = z.object({
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).optional().default(""),
  content: z.string().trim().min(1, "Le contenu des accords est requis").max(50000, "Le contenu ne peut pas dépasser 50 000 caractères"),
})

export type SongInput = z.infer<typeof songSchema>
export type EditSheetInput = z.infer<typeof editSheetSchema>
