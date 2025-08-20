import { type PricingConfig, type InsertPricingConfig, type AdminConfigUpdate, pricingConfigs } from "@shared/schema";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";

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

class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private adminPassword: string = process.env.ADMIN_PASSWORD || "795915";

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
    this.initializeDefaultPricing();
  }

  private async initializeDefaultPricing() {
    try {
      // Check if we already have data in the database
      const existingConfigs = await this.db.select().from(pricingConfigs).limit(1);
      
      if (existingConfigs.length > 0) {
        // Database already has data, don't initialize
        return;
      }

      // Initialize with default pricing data only if database is empty
      const defaultConfigs: InsertPricingConfig[] = [
        { projectType: "lawyers", years: 1, basePrice: 100, backupCertificatePrice: 50, icon: "Scale", tokenPrice: 120, tokenIncluded: "true" },
        { projectType: "lawyers", years: 2, basePrice: 150, backupCertificatePrice: 75, icon: "Scale", tokenPrice: 120, tokenIncluded: "true" },
        { projectType: "lawyers", years: 4, basePrice: 250, backupCertificatePrice: 125, icon: "Scale", tokenPrice: 120, tokenIncluded: "true" },
        { projectType: "lawyers", years: 5, basePrice: 300, backupCertificatePrice: 150, icon: "Scale", tokenPrice: 120, tokenIncluded: "true" },
        { projectType: "architects", years: 1, basePrice: 120, backupCertificatePrice: 60, icon: "Building", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "architects", years: 2, basePrice: 180, backupCertificatePrice: 90, icon: "Building", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "architects", years: 4, basePrice: 280, backupCertificatePrice: 140, icon: "Building", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "architects", years: 5, basePrice: 350, backupCertificatePrice: 175, icon: "Building", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "engineers", years: 1, basePrice: 110, backupCertificatePrice: 55, icon: "Wrench", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "engineers", years: 2, basePrice: 160, backupCertificatePrice: 80, icon: "Wrench", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "engineers", years: 4, basePrice: 260, backupCertificatePrice: 130, icon: "Wrench", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "engineers", years: 5, basePrice: 320, backupCertificatePrice: 160, icon: "Wrench", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "magna", years: 3, basePrice: 200, backupCertificatePrice: 100, icon: "GraduationCap", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "regular", years: 1, basePrice: 80, backupCertificatePrice: 40, icon: "User", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "regular", years: 2, basePrice: 120, backupCertificatePrice: 60, icon: "User", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "regular", years: 4, basePrice: 200, backupCertificatePrice: 100, icon: "User", tokenPrice: 120, tokenIncluded: "optional" },
        { projectType: "regular", years: 5, basePrice: 250, backupCertificatePrice: 125, icon: "User", tokenPrice: 120, tokenIncluded: "optional" },
      ];

      for (const config of defaultConfigs) {
        const id = randomUUID();
        await this.db.insert(pricingConfigs).values({
          ...config,
          id,
          icon: config.icon || "User",
          tokenPrice: config.tokenPrice || 120,
          tokenIncluded: config.tokenIncluded || "optional"
        });
      }
    } catch (error) {
      console.error('Error initializing default pricing:', error);
    }
  }

  async getPricingConfigs(): Promise<PricingConfig[]> {
    try {
      return await this.db.select().from(pricingConfigs);
    } catch (error) {
      console.error('Error getting pricing configs:', error);
      return [];
    }
  }

  async getPricingConfig(projectType: string, years: number): Promise<PricingConfig | undefined> {
    try {
      const results = await this.db.select()
        .from(pricingConfigs)
        .where(and(
          eq(pricingConfigs.projectType, projectType),
          eq(pricingConfigs.years, years)
        ));
      return results[0] || undefined;
    } catch (error) {
      console.error('Error getting pricing config:', error);
      return undefined;
    }
  }

  async createPricingConfig(insertConfig: InsertPricingConfig): Promise<PricingConfig> {
    try {
      const id = randomUUID();
      const config = {
        ...insertConfig,
        id,
        icon: insertConfig.icon || "User",
        tokenPrice: insertConfig.tokenPrice || 120,
        tokenIncluded: insertConfig.tokenIncluded || "optional"
      };
      
      await this.db.insert(pricingConfigs).values(config);
      return config as PricingConfig;
    } catch (error) {
      console.error('Error creating pricing config:', error);
      throw error;
    }
  }

  async updatePricingConfig(id: string, updates: Partial<PricingConfig>): Promise<PricingConfig | undefined> {
    try {
      const results = await this.db.update(pricingConfigs)
        .set(updates)
        .where(eq(pricingConfigs.id, id))
        .returning();
      
      return results[0] || undefined;
    } catch (error) {
      console.error('Error updating pricing config:', error);
      return undefined;
    }
  }

  async deletePricingConfig(id: string): Promise<boolean> {
    try {
      const results = await this.db.delete(pricingConfigs)
        .where(eq(pricingConfigs.id, id))
        .returning();
      
      return results.length > 0;
    } catch (error) {
      console.error('Error deleting pricing config:', error);
      return false;
    }
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

export const storage = new DatabaseStorage();
