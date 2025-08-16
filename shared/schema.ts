import { pgTable, text, varchar, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const pricingConfigs = pgTable("pricing_configs", {
  id: varchar("id").primaryKey(),
  projectType: text("project_type").notNull(),
  years: integer("years").notNull(),
  basePrice: real("base_price").notNull(),
  backupCertificatePrice: real("backup_certificate_price").notNull(),
});

export const insertPricingConfigSchema = createInsertSchema(pricingConfigs).omit({
  id: true,
});

export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;
export type PricingConfig = typeof pricingConfigs.$inferSelect;

// Additional types for the calculator
export interface CalculationRequest {
  projectType: string;
  years: number;
  certificates: number;
  backupCertificates: number;
}

export interface CalculationResult {
  totalPrice: number;
  basePrice: number;
  totalCertificates: number;
  discountedCertificates: number;
  discountInfo: string;
}

// Admin management types
export interface AdminLoginRequest {
  password: string;
}

export interface AdminConfigUpdate {
  projectType: string;
  years: number;
  basePrice: number;
  backupCertificatePrice: number;
}

export interface AdminPasswordChange {
  currentPassword: string;
  newPassword: string;
}
