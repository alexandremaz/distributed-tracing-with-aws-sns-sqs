import "./tracing.ts";
import { config } from "./config/index.ts";
import { pollLoop } from "./consume.ts";

async function main() {
  const { MY_TOPIC, MY_QUEUE, ROLE } = config;

  console.log(
    {
      MY_QUEUE,
      MY_TOPIC,
      ROLE,
    },
    "start",
  );

  await pollLoop({
    myQueueName: MY_QUEUE,
    myTopicName: MY_TOPIC,
    role: ROLE,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
