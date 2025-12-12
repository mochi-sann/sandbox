import "dotenv/config";
import { Elysia } from "elysia";
export declare const app: Elysia<
  "",
  {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
  },
  {
    typebox: {};
    error: {};
  } & {
    typebox: {};
    error: {};
  } & {
    typebox: {};
    error: {};
  },
  {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
  } & {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
  } & {
    schema: {};
    standaloneSchema: {};
    macro: {};
    macroFn: {};
    parser: {};
    response: {};
  },
  {
    api: {
      auth: {
        "*": {
          [x: string]: {
            body: unknown;
            params: {
              "*": string;
            } & {};
            query: unknown;
            headers: unknown;
            response: {
              200: Response;
              405: "Method Not Allowed";
              422: {
                type: "validation";
                on: string;
                summary?: string;
                message?: string;
                found?: unknown;
                property?: string;
                expected?: string;
              };
            };
          };
        };
      };
    };
  } & {
    "rpc*": {
      [x: string]: {
        body: unknown;
        params: {};
        query: unknown;
        headers: unknown;
        response: {
          200: Response;
        };
      };
    };
  } & {
    "api*": {
      [x: string]: {
        body: unknown;
        params: {};
        query: unknown;
        headers: unknown;
        response: {
          200: Response;
        };
      };
    };
  } & {
    get: {
      body: unknown;
      params: {};
      query: unknown;
      headers: unknown;
      response: {
        200: string;
      };
    };
  },
  {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
  },
  {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
  } & {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
  } & {
    derive: {};
    resolve: {};
    schema: {};
    standaloneSchema: {};
    response: {};
  }
>;
