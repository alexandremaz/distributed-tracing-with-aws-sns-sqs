import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";

export const sns = new SNSClient();
export const sqs = new SQSClient();
