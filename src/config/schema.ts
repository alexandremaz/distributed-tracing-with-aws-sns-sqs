import { z } from "zod";

const common = {
  ACCOUNT_NUMBER: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_ENDPOINT: z.url(),
  AWS_REGION: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
};

const provisionSchema = z.object({
  ...common,
  ROLE: z.literal("provision"),
});

const workerSchema = z.object({
  ...common,
  MY_QUEUE: z.string(),
  MY_TOPIC: z.string(),
  ROLE: z.enum(["first", "second"]),
});

export const schema = z.discriminatedUnion("ROLE", [
  provisionSchema,
  workerSchema,
]);
