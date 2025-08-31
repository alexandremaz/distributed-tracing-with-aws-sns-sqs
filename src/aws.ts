import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
import { config } from "./config/index.ts";

export const sns = new SNSClient({
  endpoint: config.get("AWS_ENDPOINT"),
  region: config.get("AWS_REGION"),
});
export const sqs = new SQSClient({
  endpoint: config.get("AWS_ENDPOINT"),
  region: config.get("AWS_REGION"),
});
