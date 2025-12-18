import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { performance } from "node:perf_hooks";
import postgres from "postgres";
import * as schema from "./schema";

config();

const connectionString =
  process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/bun_app";

type PostgresClient = ReturnType<typeof postgres>;

const collapseWhitespace = (query: string) =>
  query.replace(/\s+/g, " ").trim();

const formatDuration = (ms: number) => `${ms.toFixed(2)}ms`;

const logSql = (
  query: string,
  params: unknown[] | undefined,
  duration: number,
  error?: unknown
) => {
  const preview = collapseWhitespace(query);
  const paramsPreview =
    params && params.length ? ` params=${JSON.stringify(params)}` : "";
  const message = `[SQL] ${preview} (${formatDuration(duration)})${paramsPreview}`;

  if (error) {
    console.error(message, error);
  } else {
    console.info(message);
  }
};

const instrumentPostgresClient = <T extends PostgresClient>(client: T): T => {
  // @ts-expect-error custom marker
  if (client.__instrumented) {
    return client;
  }

  const originalUnsafe = client.unsafe.bind(client);
  client.unsafe = ((query: string, params?: unknown[], opts?: unknown) => {
    const start = performance.now();
    const result = originalUnsafe(query, params, opts);

    if (typeof (result as Promise<unknown>).then === "function") {
      (result as Promise<unknown>).then(
        () => logSql(query, params, performance.now() - start),
        (error) => {
          logSql(query, params, performance.now() - start, error);
          throw error;
        }
      );
    } else {
      logSql(query, params, performance.now() - start);
    }

    return result;
  }) as typeof client.unsafe;

  if (typeof client.begin === "function") {
    const originalBegin = client.begin.bind(client);
    client.begin = ((...args: unknown[]) => {
      const fnIndex = typeof args[0] === "function" ? 0 : 1;
      const callback = args[fnIndex];

      if (typeof callback === "function") {
        args[fnIndex] = async (...cbArgs: unknown[]) => {
          const txClient = cbArgs[0];
          if (txClient) {
            instrumentPostgresClient(txClient as PostgresClient);
          }
          return callback(...cbArgs);
        };
      }

      return originalBegin(...args);
    }) as typeof client.begin;
  }

  Object.defineProperty(client, "__instrumented", {
    value: true,
    enumerable: false,
  });

  return client;
};

const baseClient = postgres(connectionString, {
  prepare: false,
});

const client = instrumentPostgresClient(baseClient);

export const db = drizzle(client, { schema });
export { schema };
