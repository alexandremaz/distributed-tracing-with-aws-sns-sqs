import { z } from "zod";

export const schema = z.object({
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_ENDPOINT_URL_S3: z.url(),
  AWS_ENDPOINT_URL_SNS: z.url(),
  AWS_ENDPOINT_URL_SQS: z.url(),
  AWS_REGION: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
});
