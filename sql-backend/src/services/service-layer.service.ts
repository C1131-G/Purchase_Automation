export interface ServiceLayerConfig {
  url: string;
  sessionId?: string;
}

export const createServiceLayerClient = async (_config: ServiceLayerConfig) => ({
  connected: false,
  sessionId: null,
});

export const callServiceLayer = async (_entity: string, _method: string, _data?: unknown) => null;

export const serviceLayerService = {
  callServiceLayer,
  createServiceLayerClient,
};
