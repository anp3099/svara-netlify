// src/lib/validateEnv.ts
import { z } from "zod";

// Add whatever VITE_* keys your app actually uses
const EnvSchema = z.object({
  VITE_BLINK_PROJECT_ID: z.string().min(1, "Missing VITE_BLINK_PROJECT_ID"),
  // Optional examples:
  VITE_API_BASE_URL: z.string().url().optional(),
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

const env: Env = EnvSchema.parse({
  VITE_BLINK_PROJECT_ID: import.meta.env.VITE_BLINK_PROJECT_ID,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
});

export default env;
