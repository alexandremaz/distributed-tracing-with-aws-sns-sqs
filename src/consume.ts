import { setTimeout } from "node:timers/promises";
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  type ReceiveMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { sqs } from "./aws.ts";
import { config } from "./config/index.ts";
import { publish } from "./publish.ts";

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
      };
    }
  }
}
