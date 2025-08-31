import { PublishCommand } from "@aws-sdk/client-sns";

import { sns } from "./aws.ts";
import { config } from "./config/index.ts";

function buildTopicArn({
  region,
  account,
  topicName,
}: {
  region: string;
  account: string;
  topicName: string;
}) {
  return `arn:aws:sns:${region}:${account}:${topicName}`;
}

export async function publish({
  payload,
  topicName,
}: {
  payload: Record<string, unknown>;
  topicName: string;
}) {
  const region = config.get("AWS_REGION");
  const account = config.get("ACCOUNT_NUMBER");
  const TopicArn = buildTopicArn({ account, region, topicName });

  await sns.send(
    new PublishCommand({
      Message: JSON.stringify(payload),
      TopicArn,
    }),
  );
}
