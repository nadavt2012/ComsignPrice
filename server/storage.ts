import { type PricingConfig, type InsertPricingConfig, type AdminConfigUpdate } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getPricingConfigs(): Promise<PricingConfig[]>;
  getPricingConfig(projectType: string, years: number): Promise<PricingConfig | undefined>;
  createPricingConfig(config: InsertPricingConfig): Promise<PricingConfig>;
  updatePricingConfig(id: string, config: AdminConfigUpdate): Promise<PricingConfig | undefined>;
  deletePricingConfig(id: string): Promise<boolean>;
  verifyAdminPassword(password: string): Promise<boolean>;
  updateAdminPassword(newPassword: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private pricingConfigs: Map<string, PricingConfig>;
  private adminPassword: string = "123456"; // Default password

  constructor() {
    this.pricingConfigs = new Map();
    this.initializeDefaultPricing();
  }

  private initializeDefaultPricing() {
    // Initialize with default pricing data
    const defaultConfigs: InsertPricingConfig[] = [
      { projectType: "lawyers", years: 1, basePrice: 100, backupCertificatePrice: 50 },
      { projectType: "lawyers", years: 2, basePrice: 150, backupCertificatePrice: 75 },
      { projectType: "lawyers", years: 4, basePrice: 250, backupCertificatePrice: 125 },
      { projectType: "lawyers", years: 5, basePrice: 300, backupCertificatePrice: 150 },
      { projectType: "architects", years: 1, basePrice: 120, backupCertificatePrice: 60 },
      { projectType: "architects", years: 2, basePrice: 180, backupCertificatePrice: 90 },
      { projectType: "architects", years: 4, basePrice: 280, backupCertificatePrice: 140 },
      { projectType: "architects", years: 5, basePrice: 350, backupCertificatePrice: 175 },
      { projectType: "engineers", years: 1, basePrice: 110, backupCertificatePrice: 55 },
      { projectType: "engineers", years: 2, basePrice: 160, backupCertificatePrice: 80 },
      { projectType: "engineers", years: 4, basePrice: 260, backupCertificatePrice: 130 },
      { projectType: "engineers", years: 5, basePrice: 320, backupCertificatePrice: 160 },
      { projectType: "magna", years: 3, basePrice: 200, backupCertificatePrice: 100 },
      { projectType: "regular", years: 1, basePrice: 80, backupCertificatePrice: 40 },
      { projectType: "regular", years: 2, basePrice: 120, backupCertificatePrice: 60 },
      { projectType: "regular", years: 4, basePrice: 200, backupCertificatePrice: 100 },
      { projectType: "regular", years: 5, basePrice: 250, backupCertificatePrice: 125 },
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

  async updatePricingConfig(id: string, updateConfig: AdminConfigUpdate): Promise<PricingConfig | undefined> {
    const existingConfig = this.pricingConfigs.get(id);
    if (!existingConfig) {
      return undefined;
    }
    
    const updatedConfig: PricingConfig = {
      ...existingConfig,
      projectType: updateConfig.projectType,
      years: updateConfig.years,
      basePrice: updateConfig.basePrice,
      backupCertificatePrice: updateConfig.backupCertificatePrice
    };
    
    this.pricingConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  async deletePricingConfig(id: string): Promise<boolean> {
    return this.pricingConfigs.delete(id);
  }

  async verifyAdminPassword(password: string): Promise<boolean> {
    return password === this.adminPassword;
  }

  async updateAdminPassword(newPassword: string): Promise<void> {
    this.adminPassword = newPassword;
  }
}

export const storage = new MemStorage();
