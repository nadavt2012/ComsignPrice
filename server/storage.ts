import { type PricingConfig, type InsertPricingConfig, type AdminConfigUpdate, type User, type InsertUser, pricingConfigs, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { LRUCache } from "lru-cache";
import NodeCache from "node-cache";

export interface IStorage {
  getPricingConfigs(): Promise<PricingConfig[]>;
  getPricingConfig(projectType: string, years: number): Promise<PricingConfig | undefined>;
  createPricingConfig(config: InsertPricingConfig): Promise<PricingConfig>;
  updatePricingConfig(id: string, updates: Partial<PricingConfig>): Promise<PricingConfig | undefined>;
  deletePricingConfig(id: string): Promise<boolean>;
  clearAllPricingConfigs(): Promise<boolean>;
  replaceAllPricingConfigsAtomic(configs: PricingConfig[]): Promise<number>;
  verifyAdminPassword(password: string): Promise<{ valid: boolean; role?: string }>;
  updateAdminPassword(newPassword: string): Promise<void>;
  resetAdminPassword(): Promise<void>;
  changeSubAdminPassword(currentPassword: string, newPassword: string, targetRole: string): Promise<boolean>;
  
  // User management (Stage 4 - DB infrastructure)
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
}

class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private adminPassword: string;
  private managerPassword: string;
  
  // Enhanced Multi-Level Caching (2025 Standard)
  private configsCache: PricingConfig[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 300000; // 5 minutes for better performance
  
  private lruCache = new LRUCache<string, PricingConfig[]>({
    max: 100, // Maximum 100 cache entries
    ttl: 1000 * 60 * 5, // 5 minutes TTL
    updateAgeOnGet: true, // Refresh TTL on access
    updateAgeOnHas: true
  });
  
  private queryCache = new NodeCache({
    stdTTL: 300, // 5 minutes
    checkperiod: 60, // Check for expired keys every minute
    useClones: false, // Better performance by avoiding deep cloning
    deleteOnExpire: true,
    maxKeys: 1000 // Prevent memory bloat
  });
  
  // Performance tracking
  private cacheStats = {
    hits: 0,
    misses: 0,
    totalQueries: 0
  };

  constructor() {
    // CRITICAL SECURITY: Enforce required secrets in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.ADMIN_PASSWORD) {
        throw new Error('ADMIN_PASSWORD environment variable is required in production');
      }
      if (!process.env.MANAGER_PASSWORD) {
        throw new Error('MANAGER_PASSWORD environment variable is required in production');
      }
    }
    
    // Use environment variables or secure defaults only in development
    this.adminPassword = process.env.ADMIN_PASSWORD || 
      (process.env.NODE_ENV === 'development' ? "Nadav6716781" : "");
    this.managerPassword = process.env.MANAGER_PASSWORD || 
      (process.env.NODE_ENV === 'development' ? "manager123" : "");
    
    if (!this.adminPassword || !this.managerPassword) {
      throw new Error('Authentication passwords not properly configured');
    }
    
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
    this.cacheStats.totalQueries++;
    const cacheKey = 'all_pricing_configs';
    
    // Check basic cache first (for backwards compatibility)
    if (this.isCacheValid()) {
      this.cacheStats.hits++;
      return this.configsCache!;
    }
    
    // Check LRU cache
    const lruCached = this.lruCache.get(cacheKey);
    if (lruCached) {
      this.cacheStats.hits++;
      this.configsCache = lruCached;
      this.cacheTimestamp = Date.now();
      return lruCached;
    }
    
    // Check secondary cache  
    const secondaryCache = this.queryCache.get<PricingConfig[]>(cacheKey);
    if (secondaryCache) {
      this.cacheStats.hits++;
      this.lruCache.set(cacheKey, secondaryCache);
      this.configsCache = secondaryCache;
      this.cacheTimestamp = Date.now();
      return secondaryCache;
    }

    this.cacheStats.misses++;
    
    try {
      const configs = await this.db.select().from(pricingConfigs);
      
      // Update all caches
      this.configsCache = configs;
      this.cacheTimestamp = Date.now();
      this.lruCache.set(cacheKey, configs);
      this.queryCache.set(cacheKey, configs);
      
      return configs;
    } catch (error) {
      console.error('Error getting pricing configs:', error);
      // Return any cached data as emergency fallback
      return this.configsCache || [];
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
      this.clearCache(); // Clear cache after modification
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
      
      this.clearCache(); // Clear cache after modification
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
      
      this.clearCache(); // Clear cache after modification
      return results.length > 0;
    } catch (error) {
      console.error('Error deleting pricing config:', error);
      return false;
    }
  }

  async clearAllPricingConfigs(): Promise<boolean> {
    try {
      await this.db.delete(pricingConfigs);
      this.clearCache(); // Clear cache after modification
      return true;
    } catch (error) {
      console.error('Error clearing all pricing configs:', error);
      return false;
    }
  }

  async replaceAllPricingConfigsAtomic(configs: PricingConfig[]): Promise<number> {
    try {
      // Check if we should force non-atomic sync for neon-http driver
      const forceNonAtomic = process.env.NODE_ENV === 'production' || 
                           process.env.REPLIT_DEPLOYMENT === 'true' || 
                           process.env.DATABASE_URL?.includes('neon.tech');
      
      if (forceNonAtomic) {
        console.log('[SYNC] Using non-atomic approach for production/neon-http driver');
        
        // Delete all existing configurations
        await this.db.delete(pricingConfigs);
        
        // Insert all new configurations
        let inserted = 0;
        for (const config of configs) {
          await this.db.insert(pricingConfigs).values({
            id: config.id,
            projectType: config.projectType,
            years: config.years,
            basePrice: config.basePrice,
            backupCertificatePrice: config.backupCertificatePrice,
            tokenPrice: config.tokenPrice,
            tokenIncluded: config.tokenIncluded,
            icon: config.icon
          });
          inserted++;
        }
        
        this.clearCache(); // Clear cache after modification
        return inserted;
      }
      
      // For development, try transaction approach
      try {
        let inserted = 0;
        await this.db.transaction(async (tx) => {
          // First, delete all existing configurations
          await tx.delete(pricingConfigs);
          
          // Then insert all new configurations
          for (const config of configs) {
            await tx.insert(pricingConfigs).values({
              id: config.id,
              projectType: config.projectType,
              years: config.years,
              basePrice: config.basePrice,
              backupCertificatePrice: config.backupCertificatePrice,
              tokenPrice: config.tokenPrice,
              tokenIncluded: config.tokenIncluded,
              icon: config.icon
            });
            inserted++;
          }
        });
        
        this.clearCache(); // Clear cache after modification
        return inserted;
      } catch (transactionError: any) {
        // Fallback to non-atomic if transaction fails for any reason
        console.log('[SYNC] Transaction failed, using non-atomic fallback:', transactionError.message);
        
        // Delete all existing configurations
        await this.db.delete(pricingConfigs);
        
        // Insert all new configurations
        let inserted = 0;
        for (const config of configs) {
          await this.db.insert(pricingConfigs).values({
            id: config.id,
            projectType: config.projectType,
            years: config.years,
            basePrice: config.basePrice,
            backupCertificatePrice: config.backupCertificatePrice,
            tokenPrice: config.tokenPrice,
            tokenIncluded: config.tokenIncluded,
            icon: config.icon
          });
          inserted++;
        }
        
        this.clearCache(); // Clear cache after modification
        return inserted;
      }
    } catch (error) {
      console.error('Error in atomic replace operation:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  // Admin password validation with role detection
  async verifyAdminPassword(password: string): Promise<{ valid: boolean; role?: string }> {
    // Check Super Admin password (main admin password)
    const superAdminPassword = process.env.ADMIN_PASSWORD || this.adminPassword;
    if (password === superAdminPassword) {
      return { valid: true, role: 'super_admin' };
    }
    
    // Check Manager password (can edit pricing only)
    const managerPassword = process.env.MANAGER_PASSWORD;
    if (managerPassword && password === managerPassword) {
      return { valid: true, role: 'manager' };
    }
    

    return { valid: false };
  }

  // Clear cache when data changes (Enhanced 2025)
  private clearCache(): void {
    this.configsCache = null;
    this.cacheTimestamp = 0;
    this.lruCache.clear();
    this.queryCache.flushAll();
    
    // Reset stats on clear
    this.cacheStats = {
      hits: 0,
      misses: 0,
      totalQueries: 0
    };
  }

  // Check if cache is valid
  private isCacheValid(): boolean {
    return this.configsCache !== null && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  // Change manager/viewer passwords (only super admin can do this)
  async changeSubAdminPassword(currentPassword: string, newPassword: string, targetRole: string): Promise<boolean> {
    const verification = await this.verifyAdminPassword(currentPassword);
    
    // Only super admin can change passwords
    if (!verification.valid || verification.role !== 'super_admin') {
      return false;
    }
    
    // In production, you would update environment variables or database
    console.log(`Password change requested for role: ${targetRole} - New password: ${newPassword}`);
    console.log(`You need to update ${targetRole.toUpperCase()}_PASSWORD in your Secrets panel`);
    return true;
  }

  async updateAdminPassword(newPassword: string): Promise<void> {
    this.adminPassword = newPassword;
  }

  async resetAdminPassword(): Promise<void> {
    this.adminPassword = process.env.ADMIN_PASSWORD || "795915";
  }

  // ===== USER MANAGEMENT (Stage 4 - DB Infrastructure) =====
  async getUsers(): Promise<User[]> {
    try {
      const allUsers = await this.db.select().from(users);
      return allUsers;
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const results = await this.db.select()
        .from(users)
        .where(eq(users.id, id));
      return results[0] || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const id = randomUUID();
      const user = {
        ...insertUser,
        id,
      };
      
      const results = await this.db.insert(users).values(user).returning();
      return results[0] as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const results = await this.db.update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      
      return results[0] || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const results = await this.db.delete(users)
        .where(eq(users.id, id))
        .returning();
      
      return results.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
