import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env.js";
import { buildOpenApiDocument } from "./openapi.js";

const DOCS_PATH = "/api/docs";
const SPEC_PATH = "/api/docs/openapi.json";

export function setupSwagger(app: Express): void {
  if (env.isProduction) return;

  const serverUrl = `http://localhost:${env.port}`;
  const document = buildOpenApiDocument(serverUrl);

  app.get(SPEC_PATH, (_req, res) => {
    res.json(document);
  });

  app.use(
    DOCS_PATH,
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: "CedarRose OpsHub API",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );
}

export { DOCS_PATH, SPEC_PATH };
