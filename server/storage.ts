import { type PricingConfig, type InsertPricingConfig } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getPricingConfigs(): Promise<PricingConfig[]>;
  getPricingConfig(projectType: string, years: number): Promise<PricingConfig | undefined>;
  createPricingConfig(config: InsertPricingConfig): Promise<PricingConfig>;
}

export class MemStorage implements IStorage {
  private pricingConfigs: Map<string, PricingConfig>;

  constructor() {
    this.pricingConfigs = new Map();
    this.initializeDefaultPricing();
  }

  private initializeDefaultPricing() {
    // Initialize with default pricing data
    const defaultConfigs: InsertPricingConfig[] = [
      { projectType: "lawyers", years: 1, basePrice: 100 },
      { projectType: "lawyers", years: 2, basePrice: 150 },
      { projectType: "lawyers", years: 4, basePrice: 250 },
      { projectType: "lawyers", years: 5, basePrice: 300 },
      { projectType: "architects", years: 1, basePrice: 120 },
      { projectType: "architects", years: 2, basePrice: 180 },
      { projectType: "architects", years: 4, basePrice: 280 },
      { projectType: "architects", years: 5, basePrice: 350 },
      { projectType: "engineers", years: 1, basePrice: 110 },
      { projectType: "engineers", years: 2, basePrice: 160 },
      { projectType: "engineers", years: 4, basePrice: 260 },
      { projectType: "engineers", years: 5, basePrice: 320 },
      { projectType: "magna", years: 3, basePrice: 200 },
      { projectType: "regular", years: 1, basePrice: 80 },
      { projectType: "regular", years: 2, basePrice: 120 },
      { projectType: "regular", years: 4, basePrice: 200 },
      { projectType: "regular", years: 5, basePrice: 250 },
    ];

    defaultConfigs.forEach(config => {
      const id = randomUUID();
      const fullConfig: PricingConfig = { ...config, id };
      this.pricingConfigs.set(id, fullConfig);
    });
  }

  async getPricingConfigs(): Promise<PricingConfig[]> {
    return Array.from(this.pricingConfigs.values());
  }

  async getPricingConfig(projectType: string, years: number): Promise<PricingConfig | undefined> {
    return Array.from(this.pricingConfigs.values()).find(
      config => config.projectType === projectType && config.years === years
    );
  }

  async createPricingConfig(insertConfig: InsertPricingConfig): Promise<PricingConfig> {
    const id = randomUUID();
    const config: PricingConfig = { ...insertConfig, id };
    this.pricingConfigs.set(id, config);
    return config;
  }
}

export const storage = new MemStorage();
