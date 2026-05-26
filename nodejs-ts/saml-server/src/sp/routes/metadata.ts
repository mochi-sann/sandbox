import type { Hono } from "hono";
import { buildSpMetadata } from "../../saml/metadata";
import { sp, spKeys } from "../../config";

export function registerMetadata(app: Hono): void {
  app.get("/sp/metadata", (c) => {
    const xml = buildSpMetadata({
      entityId: sp.entityId,
      certificate: spKeys().certificate,
      acsUrl: sp.acsUrl,
      sloUrl: sp.sloUrl,
    });
    return c.body(xml, 200, {
      "content-type": "application/samlmetadata+xml; charset=utf-8",
    });
  });
}
