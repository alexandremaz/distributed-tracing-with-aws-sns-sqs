import { z } from "zod";

export const schema = z.object({
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_ENDPOINT_URL_SNS: z.url(),
  AWS_ENDPOINT_URL_SQS: z.url(),
  AWS_REGION: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  DD_TRACE_AGENT_HOSTNAME: z.string().min(1),
  DD_TRACE_AGENT_PORT: z.coerce.number().int().gte(0).lte(65535),
  DD_TRACE_LOG_INJECTION: z.stringbool(),
  MY_QUEUE: z.string(),
  MY_TOPIC: z.string(),
  POLLING_DELAY_MILLISECONDS: z.coerce.number().int().gte(0),
  ROLE: z.enum(["first", "second"]),
});
