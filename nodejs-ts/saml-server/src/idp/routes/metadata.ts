import type { Hono } from "hono";
import { buildIdpMetadata } from "../../saml/metadata";
import { idp, idpKeys } from "../../config";

export function registerMetadata(app: Hono): void {
  app.get("/idp/metadata", (c) => {
    const xml = buildIdpMetadata({
      entityId: idp.entityId,
      certificate: idpKeys().certificate,
      ssoUrl: idp.ssoUrl,
      sloUrl: idp.sloUrl,
    });
    return c.body(xml, 200, {
      "content-type": "application/samlmetadata+xml; charset=utf-8",
    });
  });
}
