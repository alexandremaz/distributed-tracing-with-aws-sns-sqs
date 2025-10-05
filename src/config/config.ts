import { z } from "zod";

const loggMessageSuffix = "while trying to validate environment variables";

export function loadConfig<T extends z.ZodType>({
  env,
  schema,
}: {
  env: Record<string, string | undefined>;
  schema: T;
}): z.infer<T> {
  const safeParseResult = schema.safeParse(env);

  if (!safeParseResult.success) {
    try {
      const invalidValues = safeParseResult.error.issues.map((issue) => ({
        issueInvalidValue: issue.path.reduce(
          // biome-ignore lint/suspicious/noExplicitAny: path has already been accessed by zod
          (obj: any, key) => obj?.[key],
          env,
        ),
        issueMessage: issue.message,
        issuePath: issue.path.join("."),
      }));

      console.debug(
        {
          count: invalidValues.length,
          invalidValues: JSON.stringify(invalidValues),
        },
        `Invalid values found ${loggMessageSuffix}`,
      );
    } catch (error) {
      console.error(error, `Error ${loggMessageSuffix}`);
    }

    throw new Error(z.prettifyError(safeParseResult.error));
  }

  return safeParseResult.data;
}
