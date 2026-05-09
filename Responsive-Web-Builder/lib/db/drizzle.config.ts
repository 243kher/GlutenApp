import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const url = new URL(process.env.DATABASE_URL);
if (!url.searchParams.has("sslmode")) {
  url.searchParams.set("sslmode", "require");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: url.toString(),
  },
});
