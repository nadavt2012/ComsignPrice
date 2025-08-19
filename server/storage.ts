import { type PricingConfig, type InsertPricingConfig, type AdminConfigUpdate } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getPricingConfigs(): Promise<PricingConfig[]>;
  getPricingConfig(projectType: string, years: number): Promise<PricingConfig | undefined>;
  createPricingConfig(config: InsertPricingConfig): Promise<PricingConfig>;
  updatePricingConfig(id: string, updates: Partial<PricingConfig>): Promise<PricingConfig | undefined>;
  deletePricingConfig(id: string): Promise<boolean>;
  verifyAdminPassword(password: string): Promise<boolean>;
  updateAdminPassword(newPassword: string): Promise<void>;
  resetAdminPassword(): Promise<void>;
}

export class MemStorage implements IStorage {
  private pricingConfigs: Map<string, PricingConfig>;
  private adminPassword: string = process.env.ADMIN_PASSWORD || "795915"; // Get from env or use default for development

  constructor() {
    this.pricingConfigs = new Map();
    this.initializeDefaultPricing();
  }

  private initializeDefaultPricing() {
    // Initialize with default pricing data
    const defaultConfigs: InsertPricingConfig[] = [
      { projectType: "lawyers", years: 1, basePrice: 100, backupCertificatePrice: 50, icon: "Scale" },
      { projectType: "lawyers", years: 2, basePrice: 150, backupCertificatePrice: 75, icon: "Scale" },
      { projectType: "lawyers", years: 4, basePrice: 250, backupCertificatePrice: 125, icon: "Scale" },
      { projectType: "lawyers", years: 5, basePrice: 300, backupCertificatePrice: 150, icon: "Scale" },
      { projectType: "architects", years: 1, basePrice: 120, backupCertificatePrice: 60, icon: "Building" },
      { projectType: "architects", years: 2, basePrice: 180, backupCertificatePrice: 90, icon: "Building" },
      { projectType: "architects", years: 4, basePrice: 280, backupCertificatePrice: 140, icon: "Building" },
      { projectType: "architects", years: 5, basePrice: 350, backupCertificatePrice: 175, icon: "Building" },
      { projectType: "engineers", years: 1, basePrice: 110, backupCertificatePrice: 55, icon: "Wrench" },
      { projectType: "engineers", years: 2, basePrice: 160, backupCertificatePrice: 80, icon: "Wrench" },
      { projectType: "engineers", years: 4, basePrice: 260, backupCertificatePrice: 130, icon: "Wrench" },
      { projectType: "engineers", years: 5, basePrice: 320, backupCertificatePrice: 160, icon: "Wrench" },
      { projectType: "magna", years: 3, basePrice: 200, backupCertificatePrice: 100, icon: "GraduationCap" },
      { projectType: "regular", years: 1, basePrice: 80, backupCertificatePrice: 40, icon: "User" },
      { projectType: "regular", years: 2, basePrice: 120, backupCertificatePrice: 60, icon: "User" },
      { projectType: "regular", years: 4, basePrice: 200, backupCertificatePrice: 100, icon: "User" },
      { projectType: "regular", years: 5, basePrice: 250, backupCertificatePrice: 125, icon: "User" },
    ];

    defaultConfigs.forEach(config => {
      const id = randomUUID();
      const fullConfig: PricingConfig = { ...config, id, icon: config.icon || "User" };
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
    const config: PricingConfig = { ...insertConfig, id, icon: insertConfig.icon || "User" };
    this.pricingConfigs.set(id, config);
    return config;
  }

  async updatePricingConfig(id: string, updates: Partial<PricingConfig>): Promise<PricingConfig | undefined> {
    const existingConfig = this.pricingConfigs.get(id);
    if (!existingConfig) {
      return undefined;
    }

    const updatedConfig = { ...existingConfig, ...updates };
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

  async resetAdminPassword(): Promise<void> {
    this.adminPassword = process.env.ADMIN_PASSWORD || "795915";
  }
}

export const storage = new MemStorage();
