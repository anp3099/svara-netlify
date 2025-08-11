// src/lib/validateEnv.ts

export type Env = {
  VITE_BLINK_PROJECT_ID?: string;
  VITE_API_BASE_URL?: string;
  VITE_STRIPE_PUBLISHABLE_KEY?: string;
};

export function validateClientEnv(): Env {
  // Access Vite envs
  const env = import.meta.env as unknown as Env;

  // Require what you absolutely need for the app to run.
  if (!env.VITE_BLINK_PROJECT_ID) {
    console.warn('Missing VITE_BLINK_PROJECT_ID');
  }

  // Optional: add more checks as needed.
  return env;
}
