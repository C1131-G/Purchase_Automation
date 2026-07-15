// Shared helper: register list/create/get/patch/cancel/docnums for one document module.

import type { ZodTypeAny } from "zod";

import {
  cookieSecurity,
  entityPascal,
  jsonBody,
  jsonResponses,
  registerComponentSchema,
  registerPath,
} from "@/config/swagger-registry";

export type DocumentPathOptions = {
  entityPath: string;
  entityLabel: string;
  supportsCancel?: boolean;
  supportsUpdate?: boolean;
  createSchema?: ZodTypeAny;
  updateSchema?: ZodTypeAny;
  schemaNames?: { create?: string; update?: string };
};

export const registerDocumentPaths = (options: DocumentPathOptions) => {
  const {
    entityPath,
    entityLabel,
    supportsCancel = true,
    supportsUpdate = true,
    createSchema,
    updateSchema,
    schemaNames,
  } = options;
  const id = entityPascal(entityPath);
  const secured = { security: cookieSecurity };

  if (createSchema && schemaNames?.create) {
    registerComponentSchema(schemaNames.create, createSchema);
  }
  if (updateSchema && schemaNames?.update) {
    registerComponentSchema(schemaNames.update, updateSchema);
  }

  registerPath(`/${entityPath}`, "get", {
    ...secured,
    operationId: `list${id}`,
    summary: `List ${entityLabel}s`,
    description: `Paginated list of ${entityLabel} documents with filtering and sorting.`,
    tags: [entityLabel],
    responses: jsonResponses({
      successDescription: `Paginated ${entityLabel} list.`,
      successSchema: "PaginatedResponse",
    }),
  });

  registerPath(`/${entityPath}`, "post", {
    ...secured,
    operationId: `create${id}`,
    summary: `Create ${entityLabel}`,
    description: `Creates a new ${entityLabel} document (Service Layer / HANA).`,
    tags: [entityLabel],
    ...(createSchema ? { request: jsonBody(createSchema, `${entityLabel} create payload.`) } : {}),
    responses: jsonResponses({
      successStatus: "201",
      successDescription: `${entityLabel} created.`,
    }),
  });

  registerPath(`/${entityPath}/{id}`, "get", {
    ...secured,
    operationId: `get${id}ById`,
    summary: `Get ${entityLabel} by ID`,
    description: `Full ${entityLabel} detail including lines when available.`,
    tags: [entityLabel],
    responses: jsonResponses({
      successDescription: `${entityLabel} details.`,
      includeNotFound: true,
    }),
  });

  if (supportsUpdate) {
    registerPath(`/${entityPath}/{id}`, "patch", {
      ...secured,
      operationId: `update${id}`,
      summary: `Update ${entityLabel}`,
      description: `Updates an existing ${entityLabel} (draft or open, as allowed by SAP).`,
      tags: [entityLabel],
      ...(updateSchema
        ? { request: jsonBody(updateSchema, `${entityLabel} update payload.`) }
        : {}),
      responses: jsonResponses({
        successDescription: `${entityLabel} updated.`,
        includeNotFound: true,
      }),
    });
  }

  if (supportsCancel) {
    registerPath(`/${entityPath}/{id}/cancel`, "post", {
      ...secured,
      operationId: `cancel${id}`,
      summary: `Cancel ${entityLabel}`,
      description: `Cancels/closes an active ${entityLabel}.`,
      tags: [entityLabel],
      responses: jsonResponses({
        successDescription: `${entityLabel} cancelled.`,
        includeNotFound: true,
      }),
    });
  }

  registerPath(`/${entityPath}/docnums`, "get", {
    ...secured,
    operationId: `list${id}DocNums`,
    summary: `${entityLabel} doc number lookup`,
    description: `DocNum suggestions for ${entityLabel} lookup fields.`,
    tags: [entityLabel],
    responses: jsonResponses({
      successDescription: "Doc number suggestion list.",
    }),
  });
};
