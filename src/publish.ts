import { CreateTopicCommand, PublishCommand } from "@aws-sdk/client-sns";

import { sns } from "./aws.ts";

async function getTopicArn({ topicName }: { topicName: string }) {
  const { TopicArn: topicArn } = await sns.send(
    new CreateTopicCommand({
      Name: topicName,
    }),
  );

  if (!topicArn) {
    throw new Error(`No topicArn was retrieved for topic ${topicName}`);
  }

  return topicArn;
}

export async function publish({
  payload,
  topicName,
}: {
  payload: Record<string, unknown>;
  topicName: string;
}) {
  const TopicArn = await getTopicArn({ topicName });

  await sns.send(
    new PublishCommand({
      Message: JSON.stringify(payload),
      TopicArn,
    }),
  );
}
