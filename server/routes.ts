import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import type { CalculationRequest, CalculationResult } from "@shared/schema";

const calculationRequestSchema = z.object({
  projectType: z.string(),
  years: z.number(),
  certificates: z.number().min(1),
  backupCertificates: z.number().min(0),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all pricing configurations
  app.get("/api/pricing", async (req, res) => {
    try {
      const configs = await storage.getPricingConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pricing configurations" });
    }
  });

  // Get available years for a project type
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

      const totalCertificates = data.certificates + data.backupCertificates;
      const basePrice = pricingConfig.basePrice;
      
      // Calculate discount: every second certificate gets 50% discount
      const fullPriceCertificates = Math.ceil(totalCertificates / 2);
      const discountedCertificates = Math.floor(totalCertificates / 2);
      
      const totalPrice = (fullPriceCertificates * basePrice) + (discountedCertificates * basePrice * 0.5);
      
      const result: CalculationResult = {
        totalPrice: Math.round(totalPrice),
        basePrice,
        totalCertificates,
        discountedCertificates,
        discountInfo: discountedCertificates > 0 ? `הנחה על ${discountedCertificates} תעודות (50%)` : ""
      };

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to calculate price" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
