import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { body, param, validationResult, ValidationChain } from "express-validator";
import validator from "validator";
import express from "express";
import path from "path";
import fs from "fs";
import { createHmac } from "crypto";

// Local imports
import { storage } from "./storage";
import type { CalculationRequest, CalculationResult, AdminLoginRequest, AdminConfigUpdate } from "@shared/schema";

// ===== ENHANCED VALIDATION SCHEMAS (2025 Standard) =====

// Comprehensive calculation request validation
const calculationRequestSchema = z.object({
  projectType: z.string()
    .min(1, "סוג פרויקט נדרש")
    .max(50, "סוג פרויקט ארוך מדי")
    .regex(/^[a-zA-Z\u0590-\u05FF\s]+$/, "סוג פרויקט מכיל תווים לא חוקיים"),
  years: z.number()
    .int("מספר שנים חייב להיות מספר שלם")
    .min(1, "מספר שנים חייב להיות לפחות 1")
    .max(10, "מספר שנים מקסימלי הוא 10"),
  certificates: z.number()
    .int("מספר תעודות חייב להיות מספר שלם")
    .min(1, "חייב להיות לפחות תעודה אחת")
    .max(1000, "מספר תעודות מקסימלי הוא 1000"),
  backupCertificates: z.number()
    .int("מספר תעודות גיבוי חייב להיות מספר שלם")
    .min(0, "מספר תעודות גיבוי לא יכול להיות שלילי")
    .max(1000, "מספר תעודות גיבוי מקסימלי הוא 1000"),
  includeToken: z.boolean().optional(),
  dayOffset: z.number()
    .int("היסט ימים חייב להיות מספר שלם")
    .min(-365, "היסט ימים מינימלי הוא -365")
    .max(365, "היסט ימים מקסימלי הוא 365")
    .optional(),
});

const adminLoginSchema = z.object({
  password: z.string()
    .min(1, "סיסמה נדרשת")
    .max(100, "סיסמה ארוכה מדי")
    .refine((pwd) => !validator.contains(pwd, '<>{}[]()'), "סיסמה מכילה תווים לא חוקיים"),
});

const adminConfigUpdateSchema = z.object({
  projectType: z.string()
    .min(1, "סוג פרויקט נדרש")
    .max(50, "סוג פרויקט ארוך מדי")
    .regex(/^[a-zA-Z\u0590-\u05FF\s]+$/, "סוג פרויקט מכיל תווים לא חוקיים"),
  years: z.number()
    .int("מספר שנים חייב להיות מספר שלם")
    .min(1, "מספר שנים חייב להיות לפחות 1")
    .max(10, "מספר שנים מקסימלי הוא 10"),
  basePrice: z.number()
    .min(0, "מחיר בסיס לא יכול להיות שלילי")
    .max(1000000, "מחיר בסיס מקסימלי הוא מיליון שקלים"),
  backupCertificatePrice: z.number()
    .min(0, "מחיר תעודת גיבוי לא יכול להיות שלילי")
    .max(1000000, "מחיר תעודת גיבוי מקסימלי הוא מיליון שקלים"),
  icon: z.string()
    .max(50, "שם אייקון ארוך מדי")
    .regex(/^[a-zA-Z0-9\-_]*$/, "שם אייקון מכיל תווים לא חוקיים")
    .optional(),
  tokenPrice: z.number()
    .min(0, "מחיר טוקן לא יכול להיות שלילי")
    .max(10000, "מחיר טוקן מקסימלי הוא 10,000 שקלים")
    .optional(),
  tokenIncluded: z.enum(["true", "false", "optional"], {
    errorMap: () => ({ message: "סטטוס טוקן חייב להיות 'true', 'false' או 'optional'" })
  }).optional(),
});

const adminPasswordChangeSchema = z.object({
  currentPassword: z.string()
    .min(1, "נדרשת סיסמה נוכחית")
    .max(100, "סיסמה נוכחית ארוכה מדי"),
  newPassword: z.string()
    .min(6, "סיסמה חדשה חייבת להכיל לפחות 6 תווים")
    .max(100, "סיסמה חדשה ארוכה מדי")
    .refine((pwd) => /[A-Za-z]/.test(pwd), "סיסמה חדשה חייבת להכיל לפחות אות אחת")
    .refine((pwd) => /\d/.test(pwd), "סיסמה חדשה חייבת להכיל לפחות ספרה אחת")
    .refine((pwd) => !validator.contains(pwd, '<>{}[]()'), "סיסמה מכילה תווים לא חוקיים"),
  targetRole: z.enum(["manager"], {
    errorMap: () => ({ message: "תפקיד יעד חייב להיות 'manager'" })
  }),
});



// ===== VALIDATION MIDDLEWARE =====

// Enhanced validation error handler (2025 Standard)
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error: any) => ({
      field: error.path || error.param || 'unknown',
      message: error.msg || 'Invalid value',
      value: error.value || 'undefined'
    }));
    
    return res.status(400).json({
      error: "נתונים לא תקינים",
      details: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Input sanitization middleware
const sanitizeInput = (req: any, res: any, next: any) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Basic XSS protection - remove potential script tags and dangerous HTML
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  
  next();
};

// Express-validator chains for specific endpoints
const calculateValidationChain: ValidationChain[] = [
  body('projectType')
    .isString()
    .withMessage('סוג פרויקט חייב להיות מחרוזת')
    .isLength({ min: 1, max: 50 })
    .withMessage('סוג פרויקט חייב להכיל 1-50 תווים')
    .matches(/^[a-zA-Z\u0590-\u05FF\s]+$/)
    .withMessage('סוג פרויקט מכיל תווים לא חוקיים'),
  
  body('years')
    .isInt({ min: 1, max: 10 })
    .withMessage('מספר שנים חייב להיות בין 1 ל-10'),
  
  body('certificates')
    .isInt({ min: 1, max: 1000 })
    .withMessage('מספר תעודות חייב להיות בין 1 ל-1000'),
  
  body('backupCertificates')
    .isInt({ min: 0, max: 1000 })
    .withMessage('מספר תעודות גיבוי חייב להיות בין 0 ל-1000'),
  
  body('includeToken')
    .optional()
    .isBoolean()
    .withMessage('כלול טוקן חייב להיות ערך בוליאני'),
  
  body('dayOffset')
    .optional()
    .isInt({ min: -365, max: 365 })
    .withMessage('היסט ימים חייב להיות בין -365 ל-365')
];

const adminLoginValidationChain: ValidationChain[] = [
  body('password')
    .isString()
    .withMessage('סיסמה חייבת להיות מחרוזת')
    .isLength({ min: 1, max: 100 })
    .withMessage('סיסמה חייבת להכיל 1-100 תווים')
    .custom((value) => {
      if (validator.contains(value, '<>{}[]()')) {
        throw new Error('סיסמה מכילה תווים לא חוקיים');
      }
      return true;
    })
];

// ===== MAIN ROUTES REGISTRATION =====
export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== HEALTH CHECK ENDPOINT =====
  // Simple health check for deployment monitoring and autoscale requirements
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Alternative health check routes for different deployment systems
  app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
  });

  app.get("/ready", (req, res) => {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString()
    });
  });
  
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

  // ===== ENHANCED PRICING API ROUTES (2025 Standard) =====
  
  // Add caching middleware for API responses
  const setCacheHeaders = (req: any, res: any, next: any) => {
    // Cache pricing data for 5 minutes
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'ETag': `"pricing-${Date.now()}"`,
      'Last-Modified': new Date().toUTCString(),
      'Vary': 'Accept-Encoding, Accept-Language'
    });
    next();
  };

  app.get("/api/pricing", setCacheHeaders, async (req, res) => {
    try {
      const configs = await storage.getPricingConfigs();
      
      // Generate ETag based on configs content for better caching
      const configHash = JSON.stringify(configs).length.toString(36);
      const etag = `"pricing-${configHash}"`;
      res.set('ETag', etag);
      
      // Check if client already has this version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "שגיאה בטעינת תצורות המחירים" });
    }
  });

  app.get("/api/pricing/:projectType/years", 
    // Enhanced parameter validation
    param('projectType')
      .isString()
      .withMessage('סוג פרויקט חייב להיות מחרוזת')
      .isLength({ min: 1, max: 50 })
      .withMessage('סוג פרויקט חייב להכיל 1-50 תווים')
      .matches(/^[a-zA-Z\u0590-\u05FF]+$/)
      .withMessage('סוג פרויקט מכיל תווים לא חוקיים'),
    handleValidationErrors,
    sanitizeInput,
    setCacheHeaders,
    async (req: express.Request, res: express.Response) => {
      try {
        const { projectType } = req.params as { projectType: string };
        const configs = await storage.getPricingConfigs();
        const years = configs
          .filter(config => config.projectType === projectType)
          .map(config => config.years)
          .sort((a, b) => a - b);
        
        // Remove duplicates for cleaner response
        const uniqueYears = Array.from(new Set(years));
        
        res.json(uniqueYears);
      } catch (error) {
        res.status(500).json({ message: "שגיאה בטעינת שנים לסוג פרויקט" });
      }
    }
  );

  // Enhanced price calculation with validation and performance optimization
  app.post("/api/calculate", 
    calculateValidationChain,
    handleValidationErrors,
    sanitizeInput,
    async (req: express.Request, res: express.Response) => {
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
  app.post("/api/admin/login", 
    adminLoginValidationChain,
    handleValidationErrors,
    sanitizeInput,
    async (req: express.Request, res: express.Response) => {
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
      
      // Trigger sync to production
      if (typeof global.triggerSync === 'function') {
        global.triggerSync();
      }
      
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
      
      // Trigger sync to production
      if (typeof global.triggerSync === 'function') {
        global.triggerSync();
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
      
      // Trigger sync to production
      if (typeof global.triggerSync === 'function') {
        global.triggerSync();
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
      
      // Trigger sync to production
      if (typeof global.triggerSync === 'function') {
        global.triggerSync();
      }
      
      res.json({ success: true, message: "Configuration updated successfully" });
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ message: "Failed to update configuration" });
    }
  });

  // Admin - Clear all pricing configurations (for testing)
  app.post("/api/admin/clear-all", async (req, res) => {
    try {
      const success = await storage.clearAllPricingConfigs();
      if (success) {
        // Trigger sync to production
        if (typeof global.triggerSync === 'function') {
          global.triggerSync();
        }
        res.json({ success: true, message: "All configurations cleared successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to clear configurations" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Error clearing configurations" });
    }
  });

  // Admin - Force sync endpoint
  app.post("/api/admin/force-sync", async (req, res) => {
    try {
      if (typeof global.triggerSync === 'function') {
        global.triggerSync();
        res.json({ success: true, message: "Sync triggered successfully" });
      } else {
        res.status(500).json({ success: false, message: "Sync function not available" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Error triggering sync" });
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

  // Production-only sync endpoint (HMAC secured)
  app.post("/internal/sync/full", async (req, res) => {
    try {
      // Security: Only allow in production environment
      const isProduction = process.env.NODE_ENV === 'production' || 
                          process.env.REPLIT_DEPLOYMENT === 'true' ||
                          process.env.ACCEPT_SYNC === 'true';
      
      if (!isProduction) {
        return res.status(403).json({ 
          error: "Sync endpoint only available in production environment",
          message: "זה זמין רק באתר המפורסם"
        });
      }

      // Validate HMAC signature
      const syncSecret = process.env.SYNC_SECRET;
      if (!syncSecret) {
        return res.status(500).json({ 
          error: "SYNC_SECRET not configured",
          message: "שגיאת תצורה בשרת"
        });
      }

      const receivedSignature = req.headers['x-sync-signature'] as string;
      const timestamp = req.headers['x-sync-timestamp'] as string;
      
      if (!receivedSignature || !timestamp) {
        return res.status(401).json({ 
          error: "Missing required headers",
          message: "חסרים נתוני אימות"
        });
      }

      // Check timestamp (prevent replay attacks - allow 5 minute window)
      const timestampNum = parseInt(timestamp);
      const now = Date.now();
      const timeDiff = Math.abs(now - timestampNum);
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        return res.status(401).json({ 
          error: "Request too old",
          message: "בקשה פגת תוקף"
        });
      }

      // Verify HMAC signature
      const rawBody = JSON.stringify(req.body);
      const expectedSignature = createHmac('sha256', syncSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');
      
      if (receivedSignature !== expectedSignature) {
        return res.status(401).json({ 
          error: "Invalid signature",
          message: "חתימה דיגיטלית שגויה"
        });
      }

      // Validate request body
      const { configs } = req.body;
      if (!Array.isArray(configs)) {
        return res.status(400).json({ 
          error: "Invalid data format",
          message: "פורמט נתונים שגוי"
        });
      }

      // Perform atomic replacement
      const replacedCount = await storage.replaceAllPricingConfigsAtomic(configs);
      
      console.log(`[SYNC] Successfully replaced ${replacedCount} pricing configurations`);
      
      res.json({
        success: true,
        message: `עודכנו בהצלחה ${replacedCount} פרויקטים`,
        replaced: replacedCount,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[SYNC] Error in sync endpoint:', error);
      res.status(500).json({ 
        error: "Sync operation failed",
        message: "שגיאה בסינכרון הנתונים",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
