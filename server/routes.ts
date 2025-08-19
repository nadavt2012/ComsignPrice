import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import path from "path";
import fs from "fs";

// Local imports
import { storage } from "./storage";
import type { CalculationRequest, CalculationResult, AdminLoginRequest, AdminConfigUpdate, AdminPasswordChange } from "@shared/schema";

// ===== VALIDATION SCHEMAS =====
const calculationRequestSchema = z.object({
  projectType: z.string(),
  years: z.number(),
  certificates: z.number().min(1),
  backupCertificates: z.number().min(0),
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
});

const adminPasswordChangeSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
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
      
      const pricingConfig = await storage.getPricingConfig(data.projectType, data.years);
      if (!pricingConfig) {
        return res.status(404).json({ message: "Pricing configuration not found" });
      }

      const regularCertificates = data.certificates;
      const backupCertificates = data.backupCertificates;
      const basePrice = pricingConfig.basePrice;
      const backupPrice = pricingConfig.backupCertificatePrice;
      
      // Calculate total price: regular certificates + backup certificates
      const regularCertificatesCost = regularCertificates * basePrice;
      const backupCertificatesCost = backupCertificates * backupPrice;
      const totalPrice = regularCertificatesCost + backupCertificatesCost;
      
      const totalCertificates = regularCertificates + backupCertificates;
      
      const result: CalculationResult = {
        totalPrice: Math.round(totalPrice),
        basePrice,
        totalCertificates,
        discountedCertificates: backupCertificates,
        discountInfo: backupCertificates > 0 ? `${backupCertificates} תעודות גיבוי (₪${backupPrice} לכל אחת)` : ""
      };

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to calculate price" });
    }
  });

  // Admin authentication endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = adminLoginSchema.parse(req.body) as AdminLoginRequest;
      const isValid = await storage.verifyAdminPassword(password);
      
      if (isValid) {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ success: false, message: "Invalid password" });
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
      const { currentPassword, newPassword } = adminPasswordChangeSchema.parse(req.body) as AdminPasswordChange;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
