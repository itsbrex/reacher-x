// features/search/lib/schemas.ts
import { z } from "zod";

export const filterSchema = z.object({
  verified: z.boolean().default(false),
  unverified: z.boolean().default(false),
  from: z.string().default(""),
  to: z.string().default(""),
  mention: z.string().default(""),
  list: z.string().default(""),
});

export type FilterFormData = z.infer<typeof filterSchema>;
