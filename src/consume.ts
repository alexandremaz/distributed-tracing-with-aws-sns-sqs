import { setTimeout } from "node:timers/promises";
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  type Message,
  ReceiveMessageCommand,
  type ReceiveMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { sqs } from "./aws.ts";
import { config } from "./config/index.ts";
import { publish } from "./publish.ts";
import tracer from "./tracing.ts";

export function getDatadogCarrierFromMessage(
  m: Message,
): Record<string, string> | null {
  try {
    const outer = JSON.parse(m.Body ?? "{}") as {
      MessageAttributes?: Record<
        string,
        { Type: string; Value?: string; BinaryValue?: string }
      >;
    };
    const dd = outer.MessageAttributes?._datadog;
    if (!dd) return null;
    const b64 = dd.Value ?? dd.BinaryValue;
    if (!b64) return null;
    return decodeDatadogBase64(b64);
  } catch {
    return null;
  }
}

function decodeDatadogBase64(b64: string): Record<string, string> {
  const obj = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as Record<
    string,
    unknown
  >;
  const carrier: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj))
    carrier[k.toLowerCase()] = String(v);
  return carrier;
}

export async function pollLoop({
  myQueueName,
  role,
  myTopicName,
}: {
  myQueueName: string;
  role: "first" | "second";
  myTopicName: string;
}) {
  const { QueueUrl } = await sqs.send(
    new GetQueueUrlCommand({ QueueName: myQueueName }),
  );

  const region = config.AWS_REGION;

  const queueProcessingSpanTags = {
    aws_service: "SQS",
    "aws.operation": "processMessage",
    "aws.region": region,
    ...(QueueUrl ? { "aws.sqs.queue_name": QueueUrl } : {}),
    queuename: myQueueName,
    region: region,
    "span.kind": "consumer",
  };

  for (;;) {
    await setTimeout(config.POLLING_DELAY_MILLISECONDS);

    if (role === "first") {
      const payload = { from: role, hello: true, ts: Date.now() };
      console.log(
        {
          ...payload,
        },
        "publishing",
      );
      await publish({
        payload: payload,
        topicName: myTopicName,
      });
    }

    const receiveMessageCommandInput: ReceiveMessageCommandInput = {
      MaxNumberOfMessages: 1,
      MessageAttributeNames: ["All"],
      QueueUrl,
      VisibilityTimeout: 5,
      WaitTimeSeconds: 1,
    };

    console.log(
      {
        ...receiveMessageCommandInput,
      },
      "polling",
    );

    const res = await sqs.send(
      new ReceiveMessageCommand(receiveMessageCommandInput),
    );

    for (const m of res.Messages ?? []) {
      const carrier = getDatadogCarrierFromMessage(m) ?? {};
      const parentCtx = tracer.extract("text_map", carrier);

      console.log({ parentCtx }, "datadog parent context retrieved");

      const tags = {
        ...queueProcessingSpanTags,
        ...(m.MessageId ? { "messaging.message_id": m.MessageId } : {}),
      };

      await tracer.trace(
        "queue.process",
        { ...(parentCtx ? { childOf: parentCtx } : {}), tags },
        async () => {
          try {
            let payload: unknown = m.Body;
            try {
              payload = JSON.parse(m.Body || "{}");
            } catch {
              console.error("could not parse payload");
            }

            console.log({ payload, role }, "retrieved payload from queue");

            if (role === "second") {
              console.log(
                {
                  from: role,
                  ts: Date.now(),
                },
                "publishing reply",
              );

              await publish({
                payload: { replyFrom: role, ts: Date.now() },
                topicName: myTopicName,
              });
            }

            await sqs.send(
              new DeleteMessageCommand({
                QueueUrl,
                ReceiptHandle: m.ReceiptHandle,
              }),
            );
          } catch (e) {
            console.error("error while polling", e);
          }
        },
      );
    }
  }
}
