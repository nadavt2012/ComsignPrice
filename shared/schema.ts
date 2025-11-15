import { pgTable, text, varchar, integer, real, timestamp } from "drizzle-orm/pg-core";
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

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  password: text("password").notNull(), // bcrypt hashed
  role: text("role").notNull(), // 'super_admin' | 'manager'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ===== ZOD SCHEMAS =====
export const insertPricingConfigSchema = createInsertSchema(pricingConfigs).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  username: z.string().min(1, "Username is required"),
});

// ===== DRIZZLE TYPES =====
export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;
export type PricingConfig = typeof pricingConfigs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
export interface AdvancedLineItem {
  years: number;
  regularCertificates: number; // תעודות רגילות בכרטיס
  tokenCertificates: number; // תעודות עם טוקן
  backupCertificates: number; // תעודות גיבוי בכרטיס
  backupTokenCertificates: number; // תעודות גיבוי עם טוקן
}

export interface CalculationRequest {
  projectType: string;
  years: number;
  certificates: number;
  backupCertificates: number;
  includeToken?: boolean;
  dayOffset?: number;
}

export interface AdvancedCalculationRequest {
  projectType: string;
  items: AdvancedLineItem[];
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
  dayOffsetInfo?: string;
  originalPrice?: number;
  backupCertificatePrice?: number;
  tokenIncludedType?: string; // "true", "false", "optional"
  totalSavings?: number; // פוטנציאל חיסכון מגיבויים
}

// ===== ADMIN MANAGEMENT TYPES =====
export interface AdminLoginRequest {
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  role?: string; // 'super_admin' | 'manager'
  lastLogin?: string;
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
  targetRole: 'manager'; // Can't change super_admin password
}

export interface AdminUser {
  role: string;
  lastLogin?: string;
  loginCount: number;
}
