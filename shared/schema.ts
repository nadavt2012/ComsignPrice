import { pgTable, text, varchar, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== DATABASE SCHEMA =====
export const pricingConfigs = pgTable("pricing_configs", {
  id: varchar("id").primaryKey(),
  projectType: text("project_type").notNull(),
  years: integer("years").notNull(),
  basePrice: real("base_price").notNull(),
  backupCertificatePrice: real("backup_certificate_price").notNull(),
  icon: text("icon").notNull().default("User"),
  tokenPrice: real("token_price").notNull().default(120),
  tokenIncluded: text("token_included").notNull().default("false"), // "true", "false", "optional"
});

// ===== ZOD SCHEMAS =====
export const insertPricingConfigSchema = createInsertSchema(pricingConfigs).omit({
  id: true,
});

// ===== DRIZZLE TYPES =====
export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;
export type PricingConfig = typeof pricingConfigs.$inferSelect;

// ===== MANUAL TYPES =====
export interface PricingConfigManual {
  id: string;
  projectType: string;
  years: number;
  basePrice: number;
  backupCertificatePrice: number;
  icon: string;
  tokenPrice: number;
  tokenIncluded: string;
}

// ===== CALCULATION TYPES =====
export interface CalculationRequest {
  projectType: string;
  years: number;
  certificates: number;
  backupCertificates: number;
  includeToken?: boolean;
}

export interface CalculationResult {
  totalPrice: number;
  basePrice: number;
  totalCertificates: number;
  discountedCertificates: number;
  discountInfo: string;
  tokenPrice?: number;
  tokenIncluded?: boolean;
  tokenDisclaimer?: string;
}

// ===== ADMIN MANAGEMENT TYPES =====
export interface AdminLoginRequest {
  password: string;
}

export interface AdminConfigUpdate {
  projectType: string;
  years: number;
  basePrice: number;
  backupCertificatePrice: number;
  icon?: string;
  tokenPrice?: number;
  tokenIncluded?: string;
}

export interface AdminPasswordChange {
  currentPassword: string;
  newPassword: string;
}
