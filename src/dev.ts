import assert from "node:assert";
import { readFile, writeFile } from "node:fs/promises";
import axios, { isAxiosError } from "axios";
import {
  createBucket,
  createPresignedUrl,
  createQueue,
  getObjectMetadata,
  getQueueArn,
  getTopicArn,
  receiveMessage,
  subscribeQueueToTopic,
  subscribeTopicToBucket,
} from "./aws.ts";

const topicArn = await getTopicArn({ topicName: "my-topic" });

const queueUrl = await createQueue({ queueName: "my-queue" });

const queueArn = await getQueueArn({ queueUrl });

await subscribeQueueToTopic({
  queueArn,
  topicArn,
});

const bucketName = "my-bucket";

await createBucket({ bucketName });

await subscribeTopicToBucket({ bucketName, topicArn });

console.log("dealing with document");

const documentName = "document.txt";

await writeFile(documentName, "foo bar foo bar foo bar");

const documentBuffer = await readFile(documentName);

const url = await createPresignedUrl({
  bucket: bucketName,
  expiresIn: 3600,
  key: "path/to/document.txt",
  metadata: {
    bar: "foo",
    foo: "bar",
  },
});

console.log({ documentBuffer, url });

try {
  const response = await axios.put(url, documentBuffer, {
    headers: {
      "Content-Type": "'application/octet-stream'",
    },
  });

  console.log({ response });
} catch (error) {
  console.log("request failed");
  if (isAxiosError(error)) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.log("Error", error.message);
    }
  } else {
    console.log(error);
  }
}

const messages = await receiveMessage({ queueUrl });

console.log({ messages });

if (messages.length > 1) {
  const records = messages[2].Records;

  assert(records[0]);

  assert(records[0].s3);

  console.log({ object: records[0].s3.object }, "ok");

  const { key } = records[0].s3.object;

  console.log({ key });

  const finalResult = await getObjectMetadata({ bucketName, key });

  console.log({ finalResult });
}
