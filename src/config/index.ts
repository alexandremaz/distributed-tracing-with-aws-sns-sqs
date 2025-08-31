import { Config } from "./config.ts";
import { schema } from "./schema.ts";

export const config = new Config({
  env: process.env,
  schema,
});
