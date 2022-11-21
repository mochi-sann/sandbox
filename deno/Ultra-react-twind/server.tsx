import { serve } from "https://deno.land/std@0.164.0/http/server.ts";
import { type Context, createServer } from "ultra/server.ts";
import { StaticRouter } from "react-router-dom/server";
import App from "./src/app.tsx";

// Twind
import "./src/twind/twind.ts";

// React Query
import { QueryClientProvider } from "@tanstack/react-query";
import { useDehydrateReactQuery } from "./src/react-query/useDehydrateReactQuery.tsx";
import { queryClient } from "./src/react-query/query-client.ts";

const server = await createServer({
  importMapPath: import.meta.resolve("./importMap.json"),
  browserEntrypoint: import.meta.resolve("./client.tsx"),
});

function ServerApp({ context }: Context) {
  useDehydrateReactQuery(queryClient);

  const requestUrl = new URL(context.req.url);

  return (
    <StaticRouter location={new URL(context.req.url).pathname}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StaticRouter>
  );
}

server.get("*", async (context) => {
  // clear query cache
  queryClient.clear();

  /**
   * Render the request
   */
  const result = await server.render(<ServerApp context={context} />);

  return context.body(result, 200, {
    "content-type": "text/html; charset=utf-8",
  });
});

if (import.meta.main) {
  serve(server.fetch);
}
export default server;
