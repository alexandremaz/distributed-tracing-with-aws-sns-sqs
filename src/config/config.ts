import { z } from "zod";

export class Config<T extends z.ZodType> {
  private readonly config: z.infer<T>;

  constructor({
    env,
    schema,
  }: {
    env: Record<string, string | undefined>;
    schema: T;
  }) {
    const result = schema.safeParse(env);

    if (!result.success) {
      const { fieldErrors, formErrors } = z.flattenError(result.error);

      const errorMessage = `[config] parsing environment configuration failed: schema validation error`;

      console.error(
        {
          formErrors,
          ...fieldErrors,
        },
        errorMessage,
      );
      throw new Error(errorMessage);
    }

    this.config = result.data;
  }

  get<K extends keyof z.infer<T>>(key: K): z.infer<T>[K] {
    return this.config[key];
  }

  all(): Readonly<z.infer<T>> {
    return this.config;
  }
}
