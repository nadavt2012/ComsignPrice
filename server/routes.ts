import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { body, param, validationResult, ValidationChain } from "express-validator";
import validator from "validator";
import express from "express";
import path from "path";
import fs from "fs";
import { createHmac } from "crypto";
import bcrypt from "bcrypt";

// Local imports
import { storage } from "./storage";
import type { CalculationRequest, CalculationResult, AdminLoginRequest, AdminConfigUpdate, AdvancedCalculationRequest } from "@shared/schema";

// ===== AUTHENTICATION MIDDLEWARE (SECURITY FIX) =====

// Require authentication middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ 
      success: false, 
      message: "נדרשת התחברות. אנא התחבר תחילה." 
    });
  }
  next();
};

// Require super admin role
const requireSuperAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ 
      success: false, 
      message: "נדרשת התחברות. אנא התחבר תחילה." 
    });
  }
  if (req.session.user.role !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: "אין הרשאה. רק מנהל ראשי יכול לבצע פעולה זו." 
    });
  }
  next();
};

// ===== ENHANCED VALIDATION SCHEMAS (2025 Standard) =====

// Comprehensive calculation request validation
const calculationRequestSchema = z.object({
  projectType: z.string()
    .min(1, "סוג פרויקט נדרש")
    .max(50, "סוג פרויקט ארוך מדי")
    .regex(/^[a-zA-Z\u0590-\u05FF\s\(\)\-\u2013\u2014\u05F3\u05F4\u201C\u201D\u2033\u2034\"\'\.\,]+$/, "סוג פרויקט מכיל תווים לא חוקיים"),
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
    .min(0, "היסט ימים לא יכול להיות שלילי")
    .max(3660, "היסט ימים מקסימלי הוא 3660 (כ-10 שנים)")
    .optional(),
});

const advancedLineItemSchema = z.object({
  years: z.number()
    .int("מספר שנים חייב להיות מספר שלם")
    .min(1, "מספר שנים חייב להיות לפחות 1")
    .max(10, "מספר שנים מקסימלי הוא 10"),
  certificateType: z.enum(["card", "token"], {
    errorMap: () => ({ message: "סוג תעודה חייב להיות 'card' או 'token'" })
  }),
  regularCertificates: z.number()
    .int("מספר תעודות חייב להיות מספר שלם")
    .min(0, "מספר תעודות לא יכול להיות שלילי")
    .max(1000, "מספר תעודות מקסימלי הוא 1000"),
  backupType: z.enum(["card", "token"], {
    errorMap: () => ({ message: "סוג גיבוי חייב להיות 'card' או 'token'" })
  }),
  backupCertificates: z.number()
    .int("מספר תעודות גיבוי חייב להיות מספר שלם")
    .min(0, "מספר תעודות גיבוי לא יכול להיות שלילי")
    .max(1000, "מספר תעודות גיבוי מקסימלי הוא 1000"),
});

const advancedCalculationRequestSchema = z.object({
  projectType: z.string()
    .min(1, "סוג פרויקט נדרש")
    .max(50, "סוג פרויקט ארוך מדי")
    .regex(/^[a-zA-Z\u0590-\u05FF\s\(\)\-\u2013\u2014\u05F3\u05F4\u201C\u201D\u2033\u2034\"\'\.\,]+$/, "סוג פרויקט מכיל תווים לא חוקיים"),
  items: z.array(advancedLineItemSchema)
    .min(1, "חייב להיות לפחות פריט אחד")
    .max(50, "מספר פריטים מקסימלי הוא 50"),
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

const createUserSchema = z.object({
  displayName: z.string()
    .min(1, "שם תצוגה נדרש")
    .max(100, "שם תצוגה ארוך מדי")
    .regex(/^[a-zA-Z\u0590-\u05FF\s\-]+$/, "שם תצוגה מכיל תווים לא חוקיים"),
  password: z.string()
    .min(6, "סיסמה חייבת להכיל לפחות 6 תווים")
    .max(100, "סיסמה ארוכה מדי")
    .refine((pwd) => /[A-Za-z]/.test(pwd), "סיסמה חייבת להכיל לפחות אות אחת")
    .refine((pwd) => /\d/.test(pwd), "סיסמה חייבת להכיל לפחות ספרה אחת")
    .refine((pwd) => !validator.contains(pwd, '<>{}[]()'), "סיסמה מכילה תווים לא חוקיים"),
  username: z.string()
    .min(3, "שם משתמש חייב להכיל לפחות 3 תווים")
    .max(50, "שם משתמש ארוך מדי")
    .regex(/^[a-z0-9_]+$/, "שם משתמש יכול להכיל רק אותיות קטנות, מספרים וקו תחתון"),
  role: z.enum(["super_admin", "manager"], {
    errorMap: () => ({ message: "תפקיד חייב להיות 'super_admin' או 'manager'" })
  }),
});

const updateUserSchema = z.object({
  displayName: z.string()
    .min(1, "שם תצוגה נדרש")
    .max(100, "שם תצוגה ארוך מדי")
    .regex(/^[a-zA-Z\u0590-\u05FF\s\-]+$/, "שם תצוגה מכיל תווים לא חוקיים")
    .optional(),
  password: z.string()
    .min(6, "סיסמה חייבת להכיל לפחות 6 תווים")
    .max(100, "סיסמה ארוכה מדי")
    .refine((pwd) => /[A-Za-z]/.test(pwd), "סיסמה חייבת להכיל לפחות אות אחת")
    .refine((pwd) => /\d/.test(pwd), "סיסמה חייבת להכיל לפחות ספרה אחת")
    .refine((pwd) => !validator.contains(pwd, '<>{}[]()'), "סיסמה מכילה תווים לא חוקיים")
    .optional(),
  role: z.enum(["super_admin", "manager"], {
    errorMap: () => ({ message: "תפקיד חייב להיות 'super_admin' או 'manager'" })
  }).optional(),
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
    .matches(/^[a-zA-Z\u0590-\u05FF\s\(\)\-\u2013\u2014\u05F3\u05F4\u201C\u201D\u2033\u2034\"\'\.\,]+$/)
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
    .isInt({ min: 0, max: 3660 })
    .withMessage('היסט ימים חייב להיות בין 0 ל-3660')
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
  
  // ===== HEALTH CHECK ENDPOINTS MOVED TO MAIN SERVER =====
  // Health check endpoints are now defined in server/index.ts before CORS middleware
  // to allow deployment health checks without origin validation
  
  // ===== PWA ROUTES =====
  app.get("/manifest.json", (req, res) => {
    // Prevent caching of manifest to ensure updates are fetched
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    const manifestPath = path.resolve(import.meta.dirname, "..", "client", "public", "manifest.json");
    res.sendFile(manifestPath);
  });

  app.get("/sw.js", (req, res) => {
    // Prevent aggressive caching of Service Worker to ensure updates are fetched
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Content-Type", "application/javascript");
    
    const swPath = path.resolve(import.meta.dirname, "..", "client", "public", "sw.js");
    res.sendFile(swPath);
  });

  app.get("/sw-v3.0.1.js", (req, res) => {
    // Prevent aggressive caching of Service Worker to ensure updates are fetched
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Content-Type", "application/javascript");
    
    const swPath = path.resolve(import.meta.dirname, "..", "client", "public", "sw-v3.0.1.js");
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

  // ===== VERSION CHECK API =====
  app.get("/api/version", (req, res) => {
    res.json({
      version: "3.0.1",
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      serviceWorker: "sw-v3.0.1.js"
    });
  });

  // ===== ENHANCED PRICING API ROUTES (2025 Standard) =====
  
  // Add caching middleware for API responses (Fixed ETag consistency)
  const setCacheHeaders = (req: any, res: any, next: any) => {
    // Cache pricing data for 5 minutes
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Last-Modified': new Date().toUTCString(),
      'Vary': 'Accept-Encoding, Accept-Language'
    });
    // Note: ETag will be set per-route based on content for consistency
    next();
  };

  app.get("/api/pricing", async (req, res) => {
    try {
      const configs = await storage.getPricingConfigs();
      
      // FIXED: Force no-cache for production to ensure fresh data after sync
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString()
      });
      
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
      .matches(/^[a-zA-Z\u0590-\u05FF\s\(\)\-\u2013\u2014\u05F3\u05F4\u201C\u201D\u2033\u2034\"\'\.\,]+$/)
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
      
      // Calculate total price: base price per certificate * quantity + backup certificates cost
      const regularCertificatesCost = basePrice * regularCertificates;
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
          : `נוספו ${totalCertificates} טוקנים בעלות ₪${totalTokenCost} (₪${tokenPrice} לכל תעודה)`;
      } else if (pricingConfig.tokenIncluded === "optional") {
        // Token is optional but not included
        tokenDisclaimer = "המחיר מתייחס לעלות הפרויקט וכרטיס עם קורא כרטיסים בלבד";
      }

      // Day offset logic - Credit for remaining days in old certificate
      // IMPORTANT: dayOffset represents the NUMBER OF DAYS REMAINING in the old certificate (credit period)
      let dayOffsetInfo = "";
      if (data.dayOffset && data.dayOffset > 0) {
        const remainingDaysInOldCert = data.dayOffset;
        const totalValidityDays = data.years * 365;
        
        // Calculate price per day based on NEW certificate
        const basePricePerDay = basePrice / totalValidityDays;
        
        // Calculate credit: price per day × remaining days in old certificate
        // Note: Credit is calculated based on NEW certificate price
        const creditAmount = Math.round(basePricePerDay * remainingDaysInOldCert);
        
        // Apply credit (reduce from total price)
        // Note: This can result in negative total if credit exceeds certificate price
        totalPrice = totalPrice - creditAmount;
        
        // Re-add token cost if it was included (token pricing unchanged by offset)
        if (pricingConfig.tokenIncluded === "optional" && data.includeToken) {
          const totalTokenCost = tokenPrice * totalCertificates;
          totalPrice += totalTokenCost;
        }
        
        // Clear user message
        dayOffsetInfo = `זיכוי עבור ${remainingDaysInOldCert} ימים שלא נוצלו: -₪${creditAmount}`;
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

  // Advanced calculation endpoint
  app.post("/api/calculate-advanced",
    async (req: express.Request, res: express.Response) => {
    try {
      const data = advancedCalculationRequestSchema.parse(req.body) as AdvancedCalculationRequest;
      
      let totalPrice = 0;
      let totalCertificates = 0;
      let totalRegularCerts = 0;
      let totalBackupCerts = 0;
      let hasTokenItems = false;
      let totalSavings = 0;
      
      // Validate at least one certificate
      const hasAnyCertificates = data.items.some(item => 
        item.regularCertificates > 0 || 
        item.backupCertificates > 0
      );
      
      if (!hasAnyCertificates) {
        return res.status(400).json({ 
          message: "Invalid request",
          error: "At least one certificate is required"
        });
      }
      
      // Process each line item
      for (const item of data.items) {
        const pricingConfig = await storage.getPricingConfig(data.projectType, item.years);
        if (!pricingConfig) {
          return res.status(404).json({ 
            message: "Pricing configuration not found",
            details: `No configuration found for project type '${data.projectType}' with ${item.years} years`
          });
        }
        
        const basePrice = pricingConfig.basePrice;
        const backupPrice = pricingConfig.backupCertificatePrice;
        const tokenPrice = pricingConfig.tokenPrice || 120;
        const tokenIncluded = pricingConfig.tokenIncluded === "true";
        
        // Calculate cost for regular certificates
        let regularCertsCost = 0;
        if (item.regularCertificates > 0) {
          if (item.certificateType === "card") {
            // Card only
            regularCertsCost = item.regularCertificates * basePrice;
          } else {
            // Card + token (unless token is included in base price)
            regularCertsCost = tokenIncluded 
              ? item.regularCertificates * basePrice 
              : item.regularCertificates * (basePrice + tokenPrice);
            hasTokenItems = true;
          }
        }
        
        // Calculate cost for backup certificates
        let backupCertsCost = 0;
        if (item.backupCertificates > 0) {
          if (item.backupType === "card") {
            // Card only
            backupCertsCost = item.backupCertificates * backupPrice;
          } else {
            // Card + token (unless token is included in backup price)
            backupCertsCost = tokenIncluded 
              ? item.backupCertificates * backupPrice 
              : item.backupCertificates * (backupPrice + tokenPrice);
            hasTokenItems = true;
          }
        }
        
        // Calculate savings for this line item
        // Savings = (regular cert price with/without token) - (backup cert price with/without token)
        if (item.backupCertificates > 0 && backupPrice > 0) {
          // Calculate actual price per regular certificate
          const regularCertPrice = item.certificateType === "card" 
            ? basePrice 
            : (tokenIncluded ? basePrice : basePrice + tokenPrice);
          
          // Calculate actual price per backup certificate
          const backupCertPrice = item.backupType === "card"
            ? backupPrice
            : (tokenIncluded ? backupPrice : backupPrice + tokenPrice);
          
          // Savings only if backup is cheaper than regular
          if (backupCertPrice < regularCertPrice) {
            const savingsPerBackup = regularCertPrice - backupCertPrice;
            totalSavings += savingsPerBackup * item.backupCertificates;
          }
        }
        
        // Add to totals
        totalPrice += regularCertsCost + backupCertsCost;
        totalCertificates += item.regularCertificates + item.backupCertificates;
        totalRegularCerts += item.regularCertificates;
        totalBackupCerts += item.backupCertificates;
      }
      
      const result: CalculationResult = {
        totalPrice: Math.round(totalPrice),
        basePrice: 0, // Not applicable for multi-line
        totalCertificates,
        discountedCertificates: totalBackupCerts,
        discountInfo: totalBackupCerts > 0 ? `${totalBackupCerts} תעודות גיבוי` : "",
        tokenIncluded: hasTokenItems,
        tokenDisclaimer: hasTokenItems ? "חישוב כולל טוקנים" : "",
        originalPrice: Math.round(totalPrice),
        totalSavings: totalSavings > 0 ? Math.round(totalSavings) : undefined
      };
      
      res.json(result);
    } catch (error) {
      console.error('Advanced calculation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ 
        message: "Failed to calculate advanced price",
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
          'manager': 'מנהל', 
          'viewer': 'צפייה בלבד'
        };
        
        // Save user session (SECURITY FIX)
        const lastLogin = new Date().toISOString();
        req.session.user = {
          role: authResult.role!,
          lastLogin
        };
        
        // Save session before sending response
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ success: false, message: "שגיאה בשמירת session" });
          }
          
          res.json({ 
            success: true, 
            message: `התחברת בהצלחה כ${roleLabels[authResult.role as keyof typeof roleLabels] || authResult.role}`,
            role: authResult.role,
            lastLogin
          });
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

  // Admin logout endpoint (SECURITY FIX)
  app.post("/api/admin/logout", (req: express.Request, res: express.Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ success: false, message: "שגיאה בהתנתקות" });
      }
      res.clearCookie('comsign.sid');
      res.json({ success: true, message: "התנתקת בהצלחה" });
    });
  });

  // Admin - Get all pricing configurations (PROTECTED)
  app.get("/api/admin/pricing", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getPricingConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing configurations" });
    }
  });

  // Admin - Create new pricing configuration (PROTECTED)
  app.post("/api/admin/pricing", requireAuth, async (req, res) => {
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

  // Admin - Update pricing configuration (PROTECTED)
  app.put("/api/admin/pricing/:id", requireAuth, async (req, res) => {
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

  // Admin - Delete pricing configuration (SUPER ADMIN ONLY)
  app.delete("/api/admin/pricing/:id", requireSuperAdmin, async (req, res) => {
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

  // Get all pricing configurations for admin (PROTECTED)
  app.get("/api/admin/configs", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getPricingConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configurations" });
    }
  });

  // Delete pricing configuration (SUPER ADMIN ONLY)
  app.delete("/api/admin/configs/:id", requireSuperAdmin, async (req, res) => {
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

  // Update pricing configuration (PROTECTED)
  app.patch("/api/admin/configs/:id", requireAuth, async (req, res) => {
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

  // Admin - Clear all pricing configurations (SUPER ADMIN ONLY)
  app.post("/api/admin/clear-all", requireSuperAdmin, async (req, res) => {
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

  // Admin - Force sync endpoint (SUPER ADMIN ONLY)
  app.post("/api/admin/force-sync", requireSuperAdmin, async (req, res) => {
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

  // Admin password change endpoint (SUPER ADMIN ONLY - for changing other users passwords)
  app.post("/api/admin/change-user-password", requireSuperAdmin, async (req, res) => {
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
      const { configs, users: usersToSync } = req.body;
      if (!Array.isArray(configs)) {
        return res.status(400).json({ 
          error: "Invalid data format",
          message: "פורמט נתונים שגוי"
        });
      }

      // Perform atomic replacement for pricing configs
      const replacedCount = await storage.replaceAllPricingConfigsAtomic(configs);
      
      console.log(`[SYNC] Successfully replaced ${replacedCount} pricing configurations`);
      
      // Optionally sync users if provided (backward compatible)
      let usersReplaced = 0;
      if (Array.isArray(usersToSync) && usersToSync.length > 0) {
        usersReplaced = await storage.replaceAllUsersAtomic(usersToSync);
        console.log(`[SYNC] Successfully replaced ${usersReplaced} users`);
      }
      
      res.json({
        success: true,
        message: usersReplaced > 0 
          ? `עודכנו בהצלחה ${replacedCount} פרויקטים ו-${usersReplaced} משתמשים`
          : `עודכנו בהצלחה ${replacedCount} פרויקטים`,
        replaced: replacedCount,
        usersReplaced,
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

  // ===== USER MANAGEMENT ROUTES (Stage 6) =====
  
  // GET /api/users - Get all users (SUPER ADMIN ONLY)
  app.get("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      
      // Don't send passwords to client
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "שגיאה בטעינת משתמשים"
      });
    }
  });

  // POST /api/users - Create new user (SUPER ADMIN ONLY)
  app.post("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      const validatedData = createUserSchema.parse(req.body);
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const newUser = await storage.createUser({
        username: validatedData.username,
        displayName: validatedData.displayName,
        password: hashedPassword,
        role: validatedData.role
      });
      
      // Don't send password back to client
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role,
        createdAt: newUser.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: error.errors 
        });
      }
      
      console.error('Error creating user:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "שגיאה ביצירת משתמש"
      });
    }
  });

  // PATCH /api/users/:id - Update user (SUPER ADMIN ONLY)
  app.patch("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);
      
      const updates: any = {};
      
      if (validatedData.displayName) {
        updates.displayName = validatedData.displayName;
      }
      
      if (validatedData.password) {
        // Hash new password
        updates.password = await bcrypt.hash(validatedData.password, 10);
      }
      
      if (validatedData.role) {
        updates.role = validatedData.role;
      }
      
      const updatedUser = await storage.updateUser(id, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ 
          error: "User not found",
          message: "משתמש לא נמצא"
        });
      }
      
      // Don't send password back to client
      res.json({
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: error.errors 
        });
      }
      
      console.error('Error updating user:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "שגיאה בעדכון משתמש"
      });
    }
  });

  // DELETE /api/users/:id - Delete user (SUPER ADMIN ONLY)
  app.delete("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: "User not found",
          message: "משתמש לא נמצא"
        });
      }
      
      res.json({ 
        success: true,
        message: "משתמש נמחק בהצלחה"
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "שגיאה במחיקת משתמש"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
