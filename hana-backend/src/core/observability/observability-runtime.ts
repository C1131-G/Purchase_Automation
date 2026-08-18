/**
 * Shared OTel process state. Shutdown lives here so server / worker entries
 * do not bundle @opentelemetry SDK constructors (tsup would leave unused externals).
 */
type Shutdownable = {
  shutdown: () => Promise<unknown>;
};

let sdk: Shutdownable | null = null;
let started = false;

export const setObservabilitySdk = (next: Shutdownable | null): void => {
  sdk = next;
};

export const markObservabilityStarted = (): void => {
  started = true;
};

export const isObservabilityStarted = (): boolean => started;

export const stopObservability = async (): Promise<void> => {
  if (!sdk) {
    started = false;
    return;
  }
  try {
    await sdk.shutdown();
  } finally {
    sdk = null;
    started = false;
  }
};
