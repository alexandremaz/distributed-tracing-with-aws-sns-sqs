import {
  CreateBucketCommand,
  HeadObjectCommand,
  PutBucketNotificationConfigurationCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SNSClient, SubscribeCommand } from "@aws-sdk/client-sns";
import {
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  type Message,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const sns = new SNSClient();
const sqs = new SQSClient();
const s3 = new S3Client();

import assert from "node:assert";
import { CreateTopicCommand, PublishCommand } from "@aws-sdk/client-sns";

const topicCache = new Map<string, string>();

export async function getTopicArn({ topicName }: { topicName: string }) {
  const topicArnFromCache = topicCache.get(topicName);

  if (topicArnFromCache) {
    return topicArnFromCache;
  }

  const { TopicArn: topicArn } = await sns.send(
    new CreateTopicCommand({
      Name: topicName,
    }),
  );

  if (!topicArn) {
    throw new Error(`No topicArn was retrieved for topic ${topicName}`);
  }

  topicCache.set(topicName, topicArn);

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

export async function getObjectMetadata({
  key,
  bucketName,
}: {
  key: string;
  bucketName: string;
}) {
  const command = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const output = await s3.send(command);

  return output;
}

export async function createPresignedUrl({
  key,
  bucket,
  expiresIn,
  metadata,
}: {
  key: string;
  bucket: string;
  expiresIn: number;
  metadata: Record<string, string>;
}) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Metadata: metadata,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });

  return url;
}

export async function createQueue({
  queueName,
}: {
  queueName: string;
}): Promise<string> {
  const data = await sqs.send(
    new CreateQueueCommand({
      QueueName: queueName,
    }),
  );

  if (!data.QueueUrl) {
    throw new Error("No queue URL");
  }

  return data.QueueUrl;
}

export async function subscribeQueueToTopic({
  topicArn,
  queueArn,
}: {
  topicArn: string;
  queueArn: string;
}): Promise<void> {
  await sns.send(
    new SubscribeCommand({
      Endpoint: queueArn,
      Protocol: "sqs",
      TopicArn: topicArn,
    }),
  );
}

export async function getQueueArn({
  queueUrl,
}: {
  queueUrl: string;
}): Promise<string> {
  const data = await sqs.send(
    new GetQueueAttributesCommand({
      AttributeNames: ["QueueArn"],
      QueueUrl: queueUrl,
    }),
  );

  return data.Attributes?.QueueArn ?? "";
}

export async function createBucket({ bucketName }: { bucketName: string }) {
  try {
    const command = new CreateBucketCommand({
      Bucket: bucketName,
    });

    await s3.send(command);
  } catch (error) {
    console.log(error);
  }
}

export async function subscribeTopicToBucket({
  bucketName,
  topicArn,
}: {
  topicArn: string;
  bucketName: string;
}) {
  const command = new PutBucketNotificationConfigurationCommand({
    Bucket: bucketName,
    NotificationConfiguration: {
      TopicConfigurations: [
        {
          Events: ["s3:ObjectCreated:Put"],
          TopicArn: topicArn,
        },
      ],
    },
  });

  await s3.send(command);
}

export async function receiveMessage({ queueUrl }: { queueUrl: string }) {
  const data = await sqs.send(
    new ReceiveMessageCommand({
      MaxNumberOfMessages: 3,
      QueueUrl: queueUrl,
      WaitTimeSeconds: 10,
    }),
  );

  const messages: Message[] = data.Messages ?? [];

  if (messages.length > 0 && messages[0] && messages[0].ReceiptHandle) {
    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: messages[0].ReceiptHandle,
      }),
    );
  }

  assert(messages.length);

  const output = [];

  for (const message of messages) {
    assert(message);

    assert(message.Body);

    const body = JSON.parse(message.Body);

    assert("Message" in body);

    const bodyMessage = JSON.parse(body.Message);

    output.push(bodyMessage);
  }

  return output;
}
