import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import path from "path";
import fs from "fs";

// Local imports
import { storage } from "./storage";
import type { CalculationRequest, CalculationResult, AdminLoginRequest, AdminConfigUpdate } from "@shared/schema";

// ===== VALIDATION SCHEMAS =====
const calculationRequestSchema = z.object({
  projectType: z.string(),
  years: z.number(),
  certificates: z.number().min(1),
  backupCertificates: z.number().min(0),
  includeToken: z.boolean().optional(),
  dayOffset: z.number().optional(),
});

const adminLoginSchema = z.object({
  password: z.string(),
});

const adminConfigUpdateSchema = z.object({
  projectType: z.string(),
  years: z.number(),
  basePrice: z.number(),
  backupCertificatePrice: z.number(),
  icon: z.string().optional(),
  tokenPrice: z.number().optional(),
  tokenIncluded: z.string().optional(),
});

const adminPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "נדרשת סיסמה נוכחית"),
  newPassword: z.string().min(1, "נדרשת סיסמה חדשה"),
  targetRole: z.enum(["manager"]),
});



// ===== MAIN ROUTES REGISTRATION =====
export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== PWA ROUTES =====
  app.get("/manifest.json", (req, res) => {
    const manifestPath = path.resolve(import.meta.dirname, "..", "client", "public", "manifest.json");
    res.sendFile(manifestPath);
  });

  app.get("/sw.js", (req, res) => {
    const swPath = path.resolve(import.meta.dirname, "..", "client", "public", "sw.js");
    res.setHeader("Content-Type", "application/javascript");
    res.sendFile(swPath);
  });

  app.get("/icon-192.png", (req, res) => {
    const iconPath = path.resolve(import.meta.dirname, "..", "client", "public", "icon-192.png");
    res.sendFile(iconPath);
  });

  app.get("/icon-512.png", (req, res) => {
    const iconPath = path.resolve(import.meta.dirname, "..", "client", "public", "icon-512.png");
    res.sendFile(iconPath);
  });

  // ===== PRICING API ROUTES =====
  app.get("/api/pricing", async (req, res) => {
    try {
      const configs = await storage.getPricingConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing configurations" });
    }
  });

  app.get("/api/pricing/:projectType/years", async (req, res) => {
    try {
      const { projectType } = req.params;
      const configs = await storage.getPricingConfigs();
      const years = configs
        .filter(config => config.projectType === projectType)
        .map(config => config.years)
        .sort((a, b) => a - b);
      res.json(years);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch years for project type" });
    }
  });

  // Calculate price
  app.post("/api/calculate", async (req, res) => {
    try {
      const data = calculationRequestSchema.parse(req.body) as CalculationRequest;
      
      // Additional validation
      if (!data.projectType || typeof data.projectType !== 'string') {
        return res.status(400).json({ 
          message: "Invalid project type",
          error: "Project type is required and must be a string" 
        });
      }
      
      if (!Number.isInteger(data.years) || data.years <= 0) {
        return res.status(400).json({ 
          message: "Invalid years",
          error: "Years must be a positive integer" 
        });
      }
      
      if (!Number.isInteger(data.certificates) || data.certificates <= 0) {
        return res.status(400).json({ 
          message: "Invalid certificates",
          error: "Certificates must be a positive integer" 
        });
      }
      
      const pricingConfig = await storage.getPricingConfig(data.projectType, data.years);
      if (!pricingConfig) {
        return res.status(404).json({ 
          message: "Pricing configuration not found",
          details: `No configuration found for project type '${data.projectType}' with ${data.years} years`
        });
      }

      const regularCertificates = data.certificates;
      const backupCertificates = data.backupCertificates;
      const basePrice = pricingConfig.basePrice;
      const backupPrice = pricingConfig.backupCertificatePrice;
      const tokenPrice = pricingConfig.tokenPrice || 120;
      
      // Calculate total price: regular certificates + backup certificates
      const regularCertificatesCost = regularCertificates * basePrice;
      const backupCertificatesCost = backupCertificates * backupPrice;
      let totalPrice = regularCertificatesCost + backupCertificatesCost;
      const originalPrice = totalPrice;
      const totalCertificates = regularCertificates + backupCertificates;
      
      // Token logic
      let tokenIncluded = false;
      let tokenDisclaimer = "";
      
      if (pricingConfig.tokenIncluded === "true") {
        // Token is included in the price
        tokenIncluded = true;
        tokenDisclaimer = "עלות טוקן כלולה במחיר";
      } else if (pricingConfig.tokenIncluded === "optional" && data.includeToken) {
        // Token is optional and user chose to include it - calculate per certificate
        const totalTokenCost = tokenPrice * totalCertificates;
        totalPrice += totalTokenCost;
        tokenIncluded = true;
        tokenDisclaimer = totalCertificates === 1 
          ? `נוסף טוקן בעלות ₪${tokenPrice}` 
          : `נוסף ${totalCertificates} טוקנים בעלות ₪${totalTokenCost} (₪${tokenPrice} לכל תעודה)`;
      } else if (pricingConfig.tokenIncluded === "optional") {
        // Token is optional but not included
        tokenDisclaimer = "המחיר מתייחס לעלות הפרויקט וכרטיס עם קורא כרטיסים בלבד";
      }

      // Day offset logic - calculate price based on unused days
      let dayOffsetInfo = "";
      if (data.dayOffset && data.dayOffset > 0) {
        // Calculate the total days in the validity period (years * 365)
        const totalValidityDays = data.years * 365;
        
        // Calculate the price per day
        const pricePerDay = totalPrice / totalValidityDays;
        
        // New price = price per day * remaining days
        const newPrice = Math.round(pricePerDay * data.dayOffset);
        const creditAmount = totalPrice - newPrice;
        
        totalPrice = newPrice;
        dayOffsetInfo = `זיכוי לפי ${data.dayOffset} ימים שנותרו מתוך ${totalValidityDays} ימי תוקף. זיכוי: ₪${creditAmount}`;
      }
      
      const result: CalculationResult = {
        totalPrice: Math.round(totalPrice),
        basePrice,
        totalCertificates,
        discountedCertificates: backupCertificates,
        discountInfo: backupCertificates > 0 ? `${backupCertificates} תעודות גיבוי (₪${backupPrice} לכל אחת)` : "",
        tokenPrice,
        tokenIncluded,
        tokenDisclaimer,
        dayOffsetInfo,
        originalPrice
      };

      res.json(result);
    } catch (error) {
      console.error('Calculate price error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ 
        message: "Failed to calculate price",
        error: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error'
      });
    }
  });

  // Admin authentication endpoint with role support
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = adminLoginSchema.parse(req.body) as AdminLoginRequest;
      const authResult = await storage.verifyAdminPassword(password);
      
      if (authResult.valid) {
        const roleLabels = {
          'super_admin': 'מנהל ראשי',
          'manager': '', 
          'viewer': 'צפייה בלבד'
        };
        
        res.json({ 
          success: true, 
          message: `התחברת בהצלחה כ${roleLabels[authResult.role as keyof typeof roleLabels] || authResult.role}`,
          role: authResult.role,
          lastLogin: new Date().toISOString()
        });
      } else {
        res.status(401).json({ success: false, message: "סיסמה שגויה" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to authenticate" });
    }
  });

  // Admin - Get all pricing configurations
  app.get("/api/admin/pricing", async (req, res) => {
    try {
      const configs = await storage.getPricingConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing configurations" });
    }
  });

  // Admin - Create new pricing configuration
  app.post("/api/admin/pricing", async (req, res) => {
    try {
      const data = adminConfigUpdateSchema.parse(req.body) as AdminConfigUpdate;
      const newConfig = await storage.createPricingConfig(data);
      res.json(newConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pricing configuration" });
    }
  });

  // Admin - Update pricing configuration
  app.put("/api/admin/pricing/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = adminConfigUpdateSchema.parse(req.body) as AdminConfigUpdate;
      const updatedConfig = await storage.updatePricingConfig(id, data);
      
      if (!updatedConfig) {
        return res.status(404).json({ message: "Pricing configuration not found" });
      }
      
      res.json(updatedConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update pricing configuration" });
    }
  });

  // Admin - Delete pricing configuration
  app.delete("/api/admin/pricing/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePricingConfig(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Pricing configuration not found" });
      }
      
      res.json({ success: true, message: "Pricing configuration deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete pricing configuration" });
    }
  });

  // Admin - Change password
  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = adminPasswordChangeSchema.parse(req.body);
      
      const isValidCurrent = await storage.verifyAdminPassword(currentPassword);
      if (!isValidCurrent) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      await storage.updateAdminPassword(newPassword);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Admin - Reset password to default
  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      await storage.resetAdminPassword();
      res.json({ success: true, message: "Password reset to default" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });



  // Get all pricing configurations for admin
  app.get("/api/admin/configs", async (req, res) => {
    try {
      const configs = await storage.getPricingConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configurations" });
    }
  });

  // Delete pricing configuration (Admin only)
  app.delete("/api/admin/configs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await storage.deletePricingConfig(id);
      
      if (result) {
        res.json({ message: "Configuration deleted successfully" });
      } else {
        res.status(404).json({ message: "Configuration not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete configuration" });
    }
  });

  // Update pricing configuration
  app.patch("/api/admin/configs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Update the configuration in storage
      await storage.updatePricingConfig(id, updates);
      
      res.json({ success: true, message: "Configuration updated successfully" });
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ message: "Failed to update configuration" });
    }
  });

  // Admin password change endpoint (only for super admin)
  app.post("/api/admin/change-password", async (req, res) => {
    try {
      const { currentPassword, newPassword, targetRole } = adminPasswordChangeSchema.parse(req.body);
      
      const success = await storage.changeSubAdminPassword(currentPassword, newPassword, targetRole);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `סיסמה חדשה נוצרה עבור ${targetRole}`,
          instruction: `עדכן את ה-Secret: ${targetRole.toUpperCase()}_PASSWORD עם: ${newPassword}`
        });
      } else {
        res.status(403).json({ success: false, message: "אין הרשאה לשנות סיסמאות (רק מנהל ראשי יכול)" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "נתונים שגויים", errors: error.errors });
      }
      res.status(500).json({ message: "שגיאה בשינוי סיסמה" });
    }
  });

  // Export all data for migration - DEV ONLY ENDPOINT (accessible from admin panel in development)
  app.get("/api/export/sql", async (req, res) => {
    try {
      // Security: Only allow in development environment
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.REPLIT_DEPLOYMENT;
      
      if (!isDevelopment) {
        return res.status(403).json({ 
          error: "Export only available in development environment",
          message: "זה זמין רק בסביבת פיתוח"
        });
      }
      
      const configs = await storage.getPricingConfigs();
      
      let sqlContent = `-- Export of pricing configurations for production import
-- Generated on ${new Date().toISOString()}
-- Total projects: ${configs.length}
-- 
-- Instructions for production import:
-- 1. Go to comsignprice.shop 
-- 2. Open admin panel with your password
-- 3. Use this SQL to import all projects
-- 

DELETE FROM pricing_configs;

`;

      for (const config of configs) {
        const values = [
          `'${config.id.replace(/'/g, "''")}'`,  // Escape single quotes
          `'${config.projectType.replace(/'/g, "''")}'`, // Escape single quotes
          config.years,
          config.basePrice,
          config.backupCertificatePrice,
          config.tokenPrice,
          `'${config.tokenIncluded}'`,
          config.icon ? `'${config.icon.replace(/'/g, "''")}'` : 'NULL'
        ].join(', ');
        
        sqlContent += `INSERT INTO pricing_configs (id, project_type, years, base_price, backup_certificate_price, token_price, token_included, icon) VALUES (${values});\n`;
      }
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="comsign_projects_export.sql"');
      res.send(sqlContent);
    } catch (error) {
      console.error('Error exporting SQL:', error);
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // Export all data for migration - JSON FORMAT (DEV ONLY)
  app.get("/api/export/json", async (req, res) => {
    try {
      // Security: Only allow in development environment
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.REPLIT_DEPLOYMENT;
      
      if (!isDevelopment) {
        return res.status(403).json({ 
          error: "Export only available in development environment",
          message: "זה זמין רק בסביבת פיתוח"
        });
      }
      
      const configs = await storage.getPricingConfigs();
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="comsign_projects_export.json"');
      res.json({
        success: true,
        exported_at: new Date().toISOString(),
        total_projects: configs.length,
        data: configs
      });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // Import data for migration - PROTECTED ENDPOINT (replaces all existing data)
  app.post("/api/admin/import-data", async (req, res) => {
    try {
      // Security check - require admin authentication
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const password = authHeader.replace('Bearer ', '');
      const authResult = await storage.verifyAdminPassword(password);
      
      if (!authResult.valid || authResult.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { data } = req.body;
      
      if (!Array.isArray(data)) {
        return res.status(400).json({ message: "Data must be an array of configurations" });
      }

      // Clear existing data first
      await storage.clearAllPricingConfigs();
      
      // Import new data
      let imported = 0;
      for (const config of data) {
        try {
          await storage.createPricingConfig({
            projectType: config.projectType,
            years: config.years,
            basePrice: config.basePrice,
            backupCertificatePrice: config.backupCertificatePrice,
            icon: config.icon || "User",
            tokenPrice: config.tokenPrice || 120,
            tokenIncluded: config.tokenIncluded || "optional"
          });
          imported++;
        } catch (error) {
          console.error("Failed to import config:", config, error);
        }
      }

      res.json({
        success: true,
        message: `יובאו בהצלחה ${imported} פרויקטים`,
        imported,
        total: data.length
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import data" });
    }
  });

  // Magic migration endpoint - automatically loads all Hebrew projects in production (PROTECTED)
  app.post("/api/magic-migration-now", async (req, res) => {
    try {
      // Security check - require super admin authentication
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const password = authHeader.replace('Bearer ', '');
      const authResult = await storage.verifyAdminPassword(password);
      
      if (!authResult.valid || authResult.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      // Check if we're in production (look for deployment indicators)  
      const isProduction = process.env.NODE_ENV === 'production' || 
                          process.env.REPLIT_DEPLOYMENT === 'true' ||
                          req.headers.host?.includes('comsignprice.shop');
      
      console.log(`Authenticated migration request from: ${req.headers.host}, isProduction: ${isProduction}`);
      
      if (!isProduction) {
        return res.json({ 
          success: false, 
          message: "זה עובד רק באתר המפורסם! היכנס ל-comsignprice.shop",
          current_host: req.headers.host,
          production_url: "https://comsignprice.shop/api/magic-migration-now"
        });
      }
      
      // We're in production - do the magic migration!
      console.log("Starting automatic Hebrew projects migration...");
      
      // Clear existing data first
      await storage.clearAllPricingConfigs();
      
      // Add all 28 Hebrew projects
      const hebrewProjects = [
        { projectType: 'מע״מ (ממשל זמין)', years: 2, basePrice: 525, backupCertificatePrice: 305, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'מע״מ (ממשל זמין)', years: 4, basePrice: 765, backupCertificatePrice: 420, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'מע״מ (ממשל זמין)', years: 5, basePrice: 880, backupCertificatePrice: 465, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'אדריכלים (רישוי זמין)', years: 4, basePrice: 455, backupCertificatePrice: 305, icon: 'Building', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'משרד העבודה ורווחה', years: 2, basePrice: 255, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'משרד העבודה ורווחה', years: 4, basePrice: 325, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'בריאות (שקדיה)', years: 2, basePrice: 285, backupCertificatePrice: 205, icon: 'Stethoscope', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'בריאות (שקדיה)', years: 4, basePrice: 395, backupCertificatePrice: 255, icon: 'Stethoscope', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'שע״מ', years: 1, basePrice: 345, backupCertificatePrice: 0, icon: 'CalcIcon', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'שע״מ', years: 2, basePrice: 375, backupCertificatePrice: 0, icon: 'CalcIcon', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'שע״מ', years: 4, basePrice: 475, backupCertificatePrice: 350, icon: 'CalcIcon', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'שע״מ', years: 5, basePrice: 520, backupCertificatePrice: 350, icon: 'CalcIcon', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'מכס (שער עולמי)', years: 2, basePrice: 290, backupCertificatePrice: 210, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'מכס (שער עולמי)', years: 4, basePrice: 475, backupCertificatePrice: 315, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'מכס (שער עולמי)', years: 5, basePrice: 535, backupCertificatePrice: 350, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'מגנא', years: 3, basePrice: 990, backupCertificatePrice: 0, icon: 'TrendingUp', tokenPrice: 120, tokenIncluded: 'true' },
        { projectType: 'עורך דין (נט המשפט)', years: 1, basePrice: 295, backupCertificatePrice: 0, icon: 'Scale', tokenPrice: 120, tokenIncluded: 'true' },
        { projectType: 'עורך דין (נט המשפט)', years: 2, basePrice: 345, backupCertificatePrice: 0, icon: 'Scale', tokenPrice: 120, tokenIncluded: 'true' },
        { projectType: 'עורך דין (נט המשפט)', years: 4, basePrice: 455, backupCertificatePrice: 335, icon: 'Scale', tokenPrice: 120, tokenIncluded: 'true' },
        { projectType: 'עורך דין (נט המשפט)', years: 5, basePrice: 555, backupCertificatePrice: 335, icon: 'Scale', tokenPrice: 120, tokenIncluded: 'true' },
        { projectType: 'נט המשפט (כתבים)', years: 2, basePrice: 550, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'true' },
        { projectType: 'אופטמטריסטים', years: 2, basePrice: 350, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'אופטמטריסטים', years: 4, basePrice: 515, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'אופטמטריסטים', years: 5, basePrice: 590, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'פורטל ספקים', years: 2, basePrice: 350, backupCertificatePrice: 270, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'פורטל ספקים', years: 4, basePrice: 515, backupCertificatePrice: 360, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'פורטל ספקים', years: 5, basePrice: 535, backupCertificatePrice: 390, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional' },
        { projectType: 'שמאים', years: 4, basePrice: 510, backupCertificatePrice: 315, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional' }
      ];
      
      let migrated = 0;
      for (const project of hebrewProjects) {
        try {
          await storage.createPricingConfig(project);
          migrated++;
        } catch (error) {
          console.error("Failed to migrate project:", project, error);
        }
      }
      
      console.log(`Migration completed: ${migrated}/${hebrewProjects.length} projects`);
      
      res.json({ 
        success: true, 
        message: `🎉 מעולה! הועברו בהצלחה ${migrated} פרויקטים לאתר המפורסם!`,
        migrated,
        total: hebrewProjects.length,
        environment: 'production',
        next_step: "עכשיו כנס לעמוד הראשי של comsignprice.shop ותראה את כל הפרויקטים בעברית!"
      });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({ 
        success: false,
        message: "שגיאה בהעברת הפרויקטים",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
