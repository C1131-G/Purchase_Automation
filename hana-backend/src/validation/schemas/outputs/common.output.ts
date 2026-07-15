// Shared API response envelopes — registered once in components/schemas and $ref'd everywhere.

import { z } from "zod";

export const SuccessResponseSchema = z
  .object({
    data: z.any().openapi({
      description: "Endpoint-specific payload. Shape varies by route.",
      example: { id: 1001, DocNum: 8001089 },
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
            example: "body.CardCode",
          }),
          message: z.string().openapi({
            description: "Validation or field-level error message.",
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
      description: "HTTP status code mirrored in the body when present.",
      example: 400,
    }),
    success: z.literal(false).openapi({
      description: "Always false for error responses.",
      example: false,
    }),
  })
  .openapi({ description: "Standard error envelope for all failed API responses." });

export const PaginatedResponseSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.union([z.number(), z.string()]).optional().openapi({
              description: "Internal document id / DocEntry when present.",
              example: 1001,
            }),
            DocNum: z.union([z.number(), z.string()]).optional().openapi({
              description: "Business document number (DocNum).",
              example: 8001089,
            }),
            CardCode: z.string().optional().openapi({
              description: "Business partner code.",
              example: "V1005",
            }),
            CardName: z.string().optional().openapi({
              description: "Business partner name.",
              example: "Acme Supplies Ltd",
            }),
            DocDate: z.string().optional().openapi({
              description: "Document date (YYYY-MM-DD or SAP date).",
              example: "2026-03-15",
            }),
            DocStatus: z.string().optional().openapi({
              description: "Document status (Open/Closed or O/C).",
              example: "Open",
            }),
            DocTotal: z.union([z.number(), z.string()]).optional().openapi({
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
            DocNum: 8001089,
            CardCode: "V1005",
            CardName: "Acme Supplies Ltd",
            DocDate: "2026-03-15",
            DocStatus: "Open",
            DocTotal: 1250.5,
          },
        ],
      }),
    limit: z.number().int().positive().openapi({
      description: "Page size (records per page).",
      example: 20,
    }),
    page: z.number().int().positive().openapi({
      description: "Current 1-based page index.",
      example: 1,
    }),
    success: z.literal(true).openapi({ example: true }),
    total: z.number().int().nonnegative().openapi({
      description: "Total matching records across all pages.",
      example: 128,
    }),
    totalPages: z.number().int().nonnegative().openapi({
      description: "ceil(total / limit).",
      example: 7,
    }),
  })
  .openapi({ description: "Paginated list envelope used by document list endpoints." });
