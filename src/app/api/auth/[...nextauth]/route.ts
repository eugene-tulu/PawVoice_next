// src/app/api/auth/[...all]/route.ts
import { betterAuth } from "better-auth"
import { kyselyAdapter } from "better-auth/adapters/kysely"
import Database from "better-sqlite3"

const sqlite = new Database(":memory:")
export const { GET, POST } = betterAuth({
  adapter: kyselyAdapter(sqlite), // ← official helper
  plugins: [
    // built-in magic-link plugin
    {
      id: "email",
      init(ctx) {
        return {
          async sendVerificationRequest({ identifier, url }) {
            console.log(`📧  Send to ${identifier}: ${url}`)
          },
        }
      },
    },
  ],
})