import { context, SpanStatusCode, trace, type Attributes, type Span } from "@opentelemetry/api";

const TRACER_NAME = "vendor-portal";

export function getTracer() {
  return trace.getTracer(TRACER_NAME);
}

/** Active W3C ids for log correlation (empty when no span / SDK off). */
export function getActiveTraceFields(): { trace_id?: string; span_id?: string } {
  const span = trace.getSpan(context.active());
  const sc = span?.spanContext();
  if (!sc || !sc.traceId || sc.traceId === "00000000000000000000000000000000") {
    return {};
  }
  return { trace_id: sc.traceId, span_id: sc.spanId };
}

export function recordExceptionOnActiveSpan(err: unknown): void {
  const span = trace.getSpan(context.active());
  if (!span) {
    return;
  }
  const error = err instanceof Error ? err : new Error(String(err));
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
}

/**
 * Run `fn` inside a named child span. Records exceptions and rethrows.
 */
export async function withSpan<T>(
  name: string,
  attrs: Attributes | undefined,
  fn: (span: Span) => Promise<T> | T,
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span) => {
    if (attrs) {
      span.setAttributes(attrs);
    }
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
