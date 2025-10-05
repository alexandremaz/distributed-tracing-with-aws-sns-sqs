import { loadConfig } from "./config.ts";
import { schema } from "./schema.ts";

export const config = loadConfig({
  env: process.env,
  schema,
});
