import type { ConfigRepository } from "./config.repository.js";
import { AppError } from "../../shared/errors/AppError.js";

export class ConfigService {
  constructor(private readonly configRepo: ConfigRepository) {}

  async get() {
    const config = await this.configRepo.get();
    if (!config) throw new AppError(404, "NOT_FOUND", "Platform config not found");
    return config;
  }

  async replace(data: Parameters<ConfigRepository["replace"]>[0], updatedBy: string) {
    return this.configRepo.replace(data, updatedBy);
  }
}
