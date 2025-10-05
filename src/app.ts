import "./tracing.ts";
import { config } from "./config/index.ts";
import { pollLoop } from "./consume.ts";
import { runProvision } from "./provision.ts";

async function main() {
  const env = config;
  const { ROLE } = env;

  if (ROLE === "provision") {
    console.log(
      {
        ROLE,
      },
      "start",
    );
    await runProvision();
    return;
  }

  const { MY_TOPIC, MY_QUEUE } = env;

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
