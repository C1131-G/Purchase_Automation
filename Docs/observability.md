# Observability (metrics + traces)

Both **sql-backend** and **hana-backend** share the same OpenTelemetry + Prometheus design.

## Pillars

| Pillar | Implementation |
|--------|----------------|
| **Logs** | Pino JSON + ALS `requestId`; access line includes `trace_id` / `span_id` when a span is active |
| **Metrics** | OTel Meter API → in-process Prometheus exporter at `METRICS_PATH` (default `/metrics`) |
| **Traces** | OTel Node SDK + HTTP/Express (+ `pg` on SQL) auto-instrumentation; OTLP HTTP when endpoint set |

## Bootstrap

SDK must load **before** instrumented libraries:

```bash
# development
tsx watch --import ./src/core/observability/register.ts src/server.ts

# production
node --import ./dist/core/observability/register.js dist/server.js
```

`register.ts` is a second tsup entry (`dist/core/observability/register.js`).

Tests set `OTEL_SDK_DISABLED=true` and `NODE_ENV=test` so exporters never start.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `OTEL_SDK_DISABLED` | `false` | Force-disable SDK (`true` in tests) |
| `OTEL_SERVICE_NAME` | package name | Resource `service.name` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | Base OTLP URL (e.g. `http://localhost:4318`); traces → `/v1/traces` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | — | Full traces URL override |
| `OTEL_TRACES_SAMPLER_ARG` | `0.1` | Sample ratio in production (`ParentBased` + ratio); dev is always-on |
| `METRICS_ENABLED` | `true` | Register Prometheus exporter + app instruments |
| `METRICS_PATH` | `/metrics` | Scrape path on the app port |
| `METRICS_BEARER_TOKEN` | — | If set, require `Authorization: Bearer <token>` on scrape |
| `OTEL_DIAG` | — | Set `true` for OTel diagnostic logs |

## Key metrics

- `http_server_request_duration_seconds` / `http_server_request_total` / `http_server_active_requests`
- `app_errors_total{code,status}`
- `dashboard_section_duration_seconds{section}`
- `auth_login_total{result}`
- `db_client_operation_duration_seconds` (HANA manual; SQL also has auto `pg` spans)
- `db_pool_connections{pool,state}`
- HANA only: `sap_sl_request_duration_seconds`, `sap_sl_request_errors_total`, `sap_sl_session_refresh_total`

**Cardinality rules:** never label by user id, company DB, full URL, raw SQL, document numbers, or session ids. Use route templates and endpoint groups (`Orders`, not `Orders(123)`).

## Example Prometheus scrape

```yaml
scrape_configs:
  - job_name: vendor-portal-hana
    metrics_path: /metrics
    static_configs:
      - targets: ["localhost:4000"]
        labels:
          service: hana-backend
  - job_name: vendor-portal-sql
    metrics_path: /metrics
    static_configs:
      - targets: ["localhost:4001"]
        labels:
          service: sql-backend
```

If `METRICS_BEARER_TOKEN` is set, add:

```yaml
    authorization:
      type: Bearer
      credentials: <token>
```

## Traces (optional local Jaeger)

```bash
# Jaeger all-in-one with OTLP
docker run --rm -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one:latest

export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# start backend with --import register
```

UI: http://localhost:16686 — look for service `sql-backend` / `hana-backend`.

## Correlation

1. Client or gateway may send `traceparent` (W3C) and/or `x-request-id`.
2. Response includes `x-request-id`.
3. Access logs include `requestId`, and when available `trace_id` + `span_id`.
4. Manual spans: `dashboard.section`, `db.hana.query`, `sap.sl.request` / `sap.sl.login`.

## Suggested alerts

- High `rate(http_server_request_total{status_code=~"5.."}[5m])`
- High p95 `http_server_request_duration_seconds`
- Rising `sap_sl_request_errors_total` or `sap_sl_session_refresh_total{result="fail"}`
- `db_pool_connections{state="waiting"}` > 0 for sustained period
- Spike in `app_errors_total`

## Security

- Prefer private network scrape only; use `METRICS_BEARER_TOKEN` in production if exposed.
- Do not put `/metrics` in public OpenAPI.
- Span attributes truncate SQL; never attach passwords, cookies, or full payloads.
