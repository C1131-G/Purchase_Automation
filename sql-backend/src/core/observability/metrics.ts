import { metrics, type Counter, type Histogram, type UpDownCounter } from "@opentelemetry/api";

const METER_NAME = "vendor-portal";

let enabled = false;

let httpDuration: Histogram | undefined;
let httpTotal: Counter | undefined;
let httpActive: UpDownCounter | undefined;
let appErrors: Counter | undefined;
let dashboardDuration: Histogram | undefined;
let authLogin: Counter | undefined;
let dbClientDuration: Histogram | undefined;
let sapSlDuration: Histogram | undefined;
let sapSlErrors: Counter | undefined;
let sapSlRefresh: Counter | undefined;

export function initAppMetrics(): void {
  if (enabled) {
    return;
  }
  enabled = true;
  const meter = metrics.getMeter(METER_NAME);

  httpDuration = meter.createHistogram("http_server_request_duration_seconds", {
    description: "HTTP server request duration in seconds",
    unit: "s",
  });
  httpTotal = meter.createCounter("http_server_request_total", {
    description: "Total HTTP server requests",
  });
  httpActive = meter.createUpDownCounter("http_server_active_requests", {
    description: "Active HTTP server requests",
  });
  appErrors = meter.createCounter("app_errors_total", {
    description: "Application errors handled by the error middleware",
  });
  dashboardDuration = meter.createHistogram("dashboard_section_duration_seconds", {
    description: "Dashboard section build duration in seconds",
    unit: "s",
  });
  authLogin = meter.createCounter("auth_login_total", {
    description: "Login attempts by result",
  });
  dbClientDuration = meter.createHistogram("db_client_operation_duration_seconds", {
    description: "Database client operation duration in seconds",
    unit: "s",
  });
  sapSlDuration = meter.createHistogram("sap_sl_request_duration_seconds", {
    description: "SAP Service Layer request duration in seconds",
    unit: "s",
  });
  sapSlErrors = meter.createCounter("sap_sl_request_errors_total", {
    description: "SAP Service Layer request errors",
  });
  sapSlRefresh = meter.createCounter("sap_sl_session_refresh_total", {
    description: "SAP Service Layer session refresh attempts",
  });
}

export function isMetricsEnabled(): boolean {
  return enabled;
}

export function recordHttpRequest(attrs: {
  method: string;
  route: string;
  status_code: number;
  durationSec: number;
}): void {
  if (!enabled) {
    return;
  }
  const labels = {
    method: attrs.method,
    route: attrs.route,
    status_code: String(attrs.status_code),
  };
  httpDuration?.record(attrs.durationSec, labels);
  httpTotal?.add(1, labels);
}

export function adjustHttpActive(method: string, delta: number): void {
  if (!enabled) {
    return;
  }
  httpActive?.add(delta, { method });
}

export function recordAppError(code: string, status: number): void {
  if (!enabled) {
    return;
  }
  appErrors?.add(1, { code: code.slice(0, 64), status: String(status) });
}

export function recordDashboardSection(section: string, durationSec: number): void {
  if (!enabled) {
    return;
  }
  dashboardDuration?.record(durationSec, { section: section.slice(0, 64) });
}

export function recordAuthLogin(result: "success" | "fail"): void {
  if (!enabled) {
    return;
  }
  authLogin?.add(1, { result });
}

export function recordDbOperation(system: string, operation: string, durationSec: number): void {
  if (!enabled) {
    return;
  }
  dbClientDuration?.record(durationSec, {
    "db.system": system,
    operation: operation.slice(0, 32),
  });
}

export function recordSapSlRequest(
  method: string,
  endpointGroup: string,
  status: string,
  durationSec: number,
): void {
  if (!enabled) {
    return;
  }
  sapSlDuration?.record(durationSec, {
    method,
    endpoint_group: endpointGroup,
    status,
  });
}

export function recordSapSlError(endpointGroup: string, errorClass: string): void {
  if (!enabled) {
    return;
  }
  sapSlErrors?.add(1, {
    endpoint_group: endpointGroup,
    error_class: errorClass.slice(0, 64),
  });
}

export function recordSapSlRefresh(result: "success" | "fail"): void {
  if (!enabled) {
    return;
  }
  sapSlRefresh?.add(1, { result });
}

/** Register observable gauges for pool connection counts. */
export function registerPoolGauges(
  getSnapshots: () => Array<{ pool: string; idle: number; active: number; waiting: number }>,
): void {
  if (!enabled) {
    return;
  }
  const meter = metrics.getMeter(METER_NAME);
  meter
    .createObservableGauge("db_pool_connections", {
      description: "Database pool connection counts by state",
    })
    .addCallback((obs) => {
      for (const snap of getSnapshots()) {
        obs.observe(snap.idle, { pool: snap.pool, state: "idle" });
        obs.observe(snap.active, { pool: snap.pool, state: "active" });
        obs.observe(snap.waiting, { pool: snap.pool, state: "waiting" });
      }
    });
}
