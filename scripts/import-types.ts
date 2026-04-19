import { z } from "zod"

export const importEntrySchema = z.object({
  title: z.string().trim().min(1).max(200),
  artists: z.array(z.string().trim().min(1).max(100)).min(1),
  style: z.enum(["bringue", "himene", "variete", "traditionnel", "autre"]),
  instrument: z.enum(["guitare", "ukulele", "basse", "ukulele-bass"]),
  originalKey: z
    .string()
    .max(10)
    .regex(/^([A-G][#b]?m?[0-9]?)?$/)
    .or(z.literal("")),
  capo: z.number().int().min(0).max(12),
  tuning: z.string().max(50).default(""),
  content: z.string().trim().min(1).max(50000),
  source: z.string().url().optional(),
  confidence: z.enum(["high", "medium", "low"]),
})

export const importOutputSchema = z.array(importEntrySchema)

export type ImportEntry = z.infer<typeof importEntrySchema>
