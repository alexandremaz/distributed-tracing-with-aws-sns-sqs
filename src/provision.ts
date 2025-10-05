import "./tracing.ts";
import { CreateTopicCommand, SubscribeCommand } from "@aws-sdk/client-sns";
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import { sns, sqs } from "./aws.ts";

async function ensureTopic(name: string) {
  const { TopicArn } = await sns.send(new CreateTopicCommand({ Name: name }));
  return TopicArn;
}

async function ensureQueue(name: string) {
  const { QueueUrl } = await sqs.send(
    new CreateQueueCommand({ QueueName: name }),
  );
  return QueueUrl;
}

async function getQueueArn(queueUrl: string) {
  const attrs = await sqs.send(
    new GetQueueAttributesCommand({
      AttributeNames: ["QueueArn"],
      QueueUrl: queueUrl,
    }),
  );
  return attrs.Attributes?.QueueArn;
}

function buildQueuePolicy(queueArn: string, topicArn: string) {
  return JSON.stringify({
    Statement: [
      {
        Action: "SQS:SendMessage",
        Condition: { ArnEquals: { "aws:SourceArn": topicArn } },
        Effect: "Allow",
        Principal: "*",
        Resource: queueArn,
      },
    ],
    Version: "2012-10-17",
  });
}

async function subscribe(topicArn: string, queueArn: string) {
  const { SubscriptionArn } = await sns.send(
    new SubscribeCommand({
      Endpoint: queueArn,
      Protocol: "sqs",
      TopicArn: topicArn,
    }),
  );

  return SubscriptionArn;
}

export async function runProvision() {
  const FIRST_TOPIC = "first-topic";
  const FIRST_QUEUE = "first-queue";
  const SECOND_TOPIC = "second-topic";
  const SECOND_QUEUE = "second-queue";

  const firstTopicArn = await ensureTopic(FIRST_TOPIC);
  const secondTopicArn = await ensureTopic(SECOND_TOPIC);

  const firstQueueUrl = await ensureQueue(FIRST_QUEUE);
  const secondQueueUrl = await ensureQueue(SECOND_QUEUE);

  if (!firstTopicArn || !secondTopicArn) {
    throw new Error("missing topic arn");
  }

  if (!firstQueueUrl || !secondQueueUrl) {
    throw new Error("missing queue url");
  }

  const firstQueueArn = await getQueueArn(firstQueueUrl);
  const secondQueueArn = await getQueueArn(secondQueueUrl);

  if (!firstQueueArn || !secondQueueArn) {
    throw new Error("missing queue arn");
  }

  await sqs.send(
    new SetQueueAttributesCommand({
      Attributes: { Policy: buildQueuePolicy(firstQueueArn, secondTopicArn) },
      QueueUrl: firstQueueUrl,
    }),
  );

  await sqs.send(
    new SetQueueAttributesCommand({
      Attributes: { Policy: buildQueuePolicy(secondQueueArn, firstTopicArn) },
      QueueUrl: secondQueueUrl,
    }),
  );

  const firstTopicSubscriptionArn = await subscribe(
    firstTopicArn,
    secondQueueArn,
  );
  const secondTopicSubscriptionArn = await subscribe(
    secondTopicArn,
    firstQueueArn,
  );

  if (!firstTopicSubscriptionArn || !secondTopicSubscriptionArn) {
    throw new Error("missing topic subscription arn");
  }

  console.log("successfully provisioned topics, queues, subscriptions", {
    firstQueueArn,
    firstTopicArn,
    secondQueueArn,
    secondTopicArn,
  });
}
