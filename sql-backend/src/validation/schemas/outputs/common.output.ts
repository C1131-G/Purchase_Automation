// Shared API response envelopes — components/schemas, referenced via $ref.

import { z } from "zod";

export const SuccessResponseSchema = z
  .object({
    data: z.any().openapi({
      description: "Endpoint-specific payload. Shape varies by route.",
      example: { id: 1001, docNum: 8001089 },
    }),
    message: z.string().optional().openapi({
      description: "Optional human-readable success message.",
      example: "Purchase order created",
    }),
    success: z.literal(true).openapi({
      description: "Always true for successful responses.",
      example: true,
    }),
  })
  .openapi({ description: "Standard success envelope for non-list endpoints." });

export const ErrorResponseSchema = z
  .object({
    details: z
      .array(
        z.object({
          field: z.string().openapi({
            description: "Request field that failed validation.",
            example: "body.cardCode",
          }),
          message: z.string().openapi({
            description: "Field-level error message.",
            example: "Required",
          }),
        }),
      )
      .optional()
      .openapi({ description: "Field-level errors (e.g. Zod validation)." }),
    errorCode: z.string().optional().openapi({
      description: "Machine-readable error code.",
      example: "VALIDATION_ERROR",
    }),
    message: z.string().openapi({
      description: "Human-readable error summary.",
      example: "Validation failed",
    }),
    status: z.number().int().optional().openapi({
      description: "HTTP status when included in the body.",
      example: 400,
    }),
    success: z.literal(false).openapi({
      description: "Always false for error responses.",
      example: false,
    }),
  })
  .openapi({ description: "Standard error envelope for failed API responses." });

/** Flat paginated envelope used in OpenAPI components (list endpoints). */
export const PaginatedResponseSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.number().int().optional().openapi({
              description: "Internal document id when present.",
              example: 1001,
            }),
            docNum: z.number().int().optional().openapi({
              description: "Business document number (DocNum).",
              example: 8001089,
            }),
            cardCode: z.string().optional().openapi({
              description: "Business partner code.",
              example: "V1005",
            }),
            cardName: z.string().optional().openapi({
              description: "Business partner name.",
              example: "Acme Supplies Ltd",
            }),
            docDate: z.string().optional().openapi({
              description: "Document date (ISO date or YYYY-MM-DD).",
              example: "2026-03-15",
            }),
            docStatus: z.string().optional().openapi({
              description: "Document status (Open/Closed/Draft or O/C/D).",
              example: "Open",
            }),
            docTotal: z.union([z.number(), z.string()]).optional().openapi({
              description: "Document total amount.",
              example: 1250.5,
            }),
          })
          .passthrough()
          .openapi({ description: "One list row; extra fields vary by document type." }),
      )
      .openapi({
        description: "Page of result rows for the requested resource.",
        example: [
          {
            id: 1001,
            docNum: 8001089,
            cardCode: "V1005",
            cardName: "Acme Supplies Ltd",
            docDate: "2026-03-15",
            docStatus: "Open",
            docTotal: 1250.5,
          },
        ],
      }),
    limit: z.number().int().positive().openapi({
      description: "Page size.",
      example: 20,
    }),
    page: z.number().int().positive().openapi({
      description: "Current 1-based page index.",
      example: 1,
    }),
    success: z.literal(true).openapi({ example: true }),
    total: z.number().int().nonnegative().openapi({
      description: "Total matching records.",
      example: 128,
    }),
    totalPages: z.number().int().nonnegative().openapi({
      description: "ceil(total / limit).",
      example: 7,
    }),
  })
  .openapi({ description: "Paginated list envelope for document list endpoints." });

/** Generic factory for typed pagination in application code (not OpenAPI components). */
export const paginatedResponseOf = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.object({
      items: z.array(itemSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
    success: z.literal(true),
  });
