import type { PlatformConfig } from "@/types";
import configData from "@/mocks/data/platform-config.json";
import { delay } from "./utils";

let configCache: PlatformConfig | null = null;

function getConfig(): PlatformConfig {
  if (!configCache) configCache = structuredClone(configData as PlatformConfig);
  return configCache;
}

export interface ConfigService {
  get(): Promise<PlatformConfig>;
  save(config: PlatformConfig): Promise<PlatformConfig>;
}

export const mockConfigService: ConfigService = {
  async get() {
    await delay(200);
    return getConfig();
  },
  async save(config) {
    await delay(500);
    configCache = structuredClone(config);
    return configCache;
  },
};
