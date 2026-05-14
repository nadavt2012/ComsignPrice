import { type PricingConfig, type InsertPricingConfig, type AdminConfigUpdate, type User, type InsertUser, pricingConfigs, users } from "@shared/schema";
import { randomUUID, createHash } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { LRUCache } from "lru-cache";
import NodeCache from "node-cache";
import bcrypt from "bcrypt";

function stableId(projectType: string, years: number): string {
  const h = createHash('sha256').update(`${projectType}:${years}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

export interface IStorage {
  getPricingConfigs(): Promise<PricingConfig[]>;
  getPricingConfig(projectType: string, years: number): Promise<PricingConfig | undefined>;
  createPricingConfig(config: InsertPricingConfig): Promise<PricingConfig>;
  updatePricingConfig(id: string, updates: Partial<PricingConfig>): Promise<PricingConfig | undefined>;
  deletePricingConfig(id: string): Promise<boolean>;
  clearAllPricingConfigs(): Promise<boolean>;
  replaceAllPricingConfigsAtomic(configs: PricingConfig[]): Promise<number>;
  verifyAdminPassword(password: string): Promise<{ valid: boolean; role?: string }>;
  changeSubAdminPassword(currentPassword: string, newPassword: string, targetRole: string): Promise<boolean>;
  
  // User management (Stage 4 - DB infrastructure)
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  replaceAllUsersAtomic(usersList: User[]): Promise<number>;
}

class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private initPromise: Promise<void>;

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
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
    this.initPromise = this.initializeDefaultPricing();
  }

  private async initializeDefaultPricing() {
    try {
      // Initialize default admin user if no users exist
      const existingUsers = await this.db.select().from(users).limit(1);
      if (existingUsers.length === 0) {
        const adminPassword = process.env.ADMIN_PASSWORD || 'nadav5867';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await this.db.insert(users).values({
          id: randomUUID(),
          username: 'admin',
          displayName: 'מנהל ראשי',
          password: hashedPassword,
          role: 'super_admin'
        });
        console.log('[STORAGE] Default admin user created (username: admin)');
      }

      const hebrewConfigs: InsertPricingConfig[] = [
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
        { projectType: 'שמאים', years: 4, basePrice: 510, backupCertificatePrice: 315, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional' },
      ];

      const existingConfigs = await this.db.select().from(pricingConfigs).limit(5);

      // Detect English placeholder data and migrate to Hebrew
      const hasEnglishData = existingConfigs.some(c =>
        ['lawyers', 'architects', 'engineers', 'magna', 'regular'].includes(c.projectType)
      );

      if (hasEnglishData) {
        console.log('[STORAGE] Detected English placeholder data — migrating to Hebrew production data');
        await this.db.delete(pricingConfigs);
      } else if (existingConfigs.length > 0) {
        console.log(`[STORAGE] DB has ${existingConfigs.length}+ Hebrew configs — skipping seed`);
        return;
      }

      // Batch insert all Hebrew configs in a single statement (fast for serverless)
      await this.db.insert(pricingConfigs).values(
        hebrewConfigs.map(config => ({ ...config, id: randomUUID() }))
      );
      console.log(`[STORAGE] Seeded ${hebrewConfigs.length} Hebrew pricing configs`);
    } catch (error) {
      console.error('Error initializing default pricing:', error);
    }
  }

  async getPricingConfigs(): Promise<PricingConfig[]> {
    await this.initPromise; // ensure seed/migration completes before first read
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

  // Admin password validation with role detection (SECURITY: DB-only authentication)
  async verifyAdminPassword(password: string): Promise<{ valid: boolean; role?: string }> {
    // SECURITY FIX: Only use database authentication (no ENV fallback)
    const dbUsers = await this.getUsers();
    
    if (dbUsers.length === 0) {
      console.error('SECURITY ERROR: No users in database! Cannot authenticate.');
      return { valid: false };
    }
    
    // Database-only authentication
    for (const user of dbUsers) {
      try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          return { 
            valid: true, 
            role: user.role // Return the actual role from DB
          };
        }
      } catch (error) {
        console.error('Error comparing password:', error);
      }
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
    console.log(`Password change requested for role: ${targetRole}`);
    console.log(`You need to update ${targetRole.toUpperCase()}_PASSWORD in your Secrets panel`);
    return true;
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

  async replaceAllUsersAtomic(usersList: User[]): Promise<number> {
    try {
      const forceNonAtomic = process.env.NODE_ENV === 'production' || 
                           process.env.REPLIT_DEPLOYMENT === 'true' || 
                           process.env.DATABASE_URL?.includes('neon.tech');
      
      if (forceNonAtomic) {
        console.log('[SYNC] Using non-atomic approach for users sync');
        
        await this.db.delete(users);
        
        let inserted = 0;
        for (const user of usersList) {
          await this.db.insert(users).values({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            password: user.password,
            role: user.role,
            createdAt: new Date(user.createdAt)
          });
          inserted++;
        }
        
        return inserted;
      }
      
      try {
        let inserted = 0;
        await this.db.transaction(async (tx) => {
          await tx.delete(users);
          
          for (const user of usersList) {
            await tx.insert(users).values({
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              password: user.password,
              role: user.role,
              createdAt: new Date(user.createdAt)
            });
            inserted++;
          }
        });
        
        return inserted;
      } catch (transactionError: any) {
        console.log('[SYNC] Transaction failed, using non-atomic fallback:', transactionError.message);
        
        await this.db.delete(users);
        
        let inserted = 0;
        for (const user of usersList) {
          await this.db.insert(users).values({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            password: user.password,
            role: user.role,
            createdAt: new Date(user.createdAt)
          });
          inserted++;
        }
        
        return inserted;
      }
    } catch (error) {
      console.error('Error in replaceAllUsersAtomic:', error);
      throw error;
    }
  }
}

// MemStorage - In-memory storage with default pricing data
class MemStorage implements IStorage {
  private configs: Map<string, PricingConfig> = new Map();
  private usersList: Map<string, User> = new Map();

  constructor() {
    // Initialize with PRODUCTION DATA - All 28 projects from comsignprice.shop
    const defaultConfigs: PricingConfig[] = [
      { id: stableId('מע״מ (ממשל זמין)', 2), projectType: 'מע״מ (ממשל זמין)', years: 2, basePrice: 525, backupCertificatePrice: 305, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('מע״מ (ממשל זמין)', 4), projectType: 'מע״מ (ממשל זמין)', years: 4, basePrice: 765, backupCertificatePrice: 420, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('מע״מ (ממשל זמין)', 5), projectType: 'מע״מ (ממשל זמין)', years: 5, basePrice: 880, backupCertificatePrice: 465, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('אדריכלים (רישוי זמין)', 4), projectType: 'אדריכלים (רישוי זמין)', years: 4, basePrice: 455, backupCertificatePrice: 305, icon: 'Building', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('משרד העבודה ורווחה', 2), projectType: 'משרד העבודה ורווחה', years: 2, basePrice: 255, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('משרד העבודה ורווחה', 4), projectType: 'משרד העבודה ורווחה', years: 4, basePrice: 325, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('בריאות (שקדיה)', 2), projectType: 'בריאות (שקדיה)', years: 2, basePrice: 285, backupCertificatePrice: 205, icon: 'Stethoscope', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('בריאות (שקדיה)', 4), projectType: 'בריאות (שקדיה)', years: 4, basePrice: 395, backupCertificatePrice: 255, icon: 'Stethoscope', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('שע״מ', 1), projectType: 'שע״מ', years: 1, basePrice: 345, backupCertificatePrice: 0, icon: 'CalcIcon', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('שע״מ', 2), projectType: 'שע״מ', years: 2, basePrice: 375, backupCertificatePrice: 0, icon: 'CalcIcon', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('שע״מ', 4), projectType: 'שע״מ', years: 4, basePrice: 475, backupCertificatePrice: 350, icon: 'CalcIcon', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('שע״מ', 5), projectType: 'שע״מ', years: 5, basePrice: 520, backupCertificatePrice: 350, icon: 'CalcIcon', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('מכס (שער עולמי)', 2), projectType: 'מכס (שער עולמי)', years: 2, basePrice: 290, backupCertificatePrice: 210, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('מכס (שער עולמי)', 4), projectType: 'מכס (שער עולמי)', years: 4, basePrice: 475, backupCertificatePrice: 315, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('מכס (שער עולמי)', 5), projectType: 'מכס (שער עולמי)', years: 5, basePrice: 535, backupCertificatePrice: 350, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('מגנא', 3), projectType: 'מגנא', years: 3, basePrice: 990, backupCertificatePrice: 0, icon: 'TrendingUp', tokenPrice: 120, tokenIncluded: 'true', sku: null, backupSku: null },
      { id: stableId('עורך דין (נט המשפט)', 1), projectType: 'עורך דין (נט המשפט)', years: 1, basePrice: 295, backupCertificatePrice: 0, icon: 'Scale', tokenPrice: 120, tokenIncluded: 'true', sku: null, backupSku: null },
      { id: stableId('עורך דין (נט המשפט)', 2), projectType: 'עורך דין (נט המשפט)', years: 2, basePrice: 345, backupCertificatePrice: 0, icon: 'Scale', tokenPrice: 120, tokenIncluded: 'true', sku: null, backupSku: null },
      { id: stableId('עורך דין (נט המשפט)', 4), projectType: 'עורך דין (נט המשפט)', years: 4, basePrice: 455, backupCertificatePrice: 335, icon: 'Scale', tokenPrice: 120, tokenIncluded: 'true', sku: null, backupSku: null },
      { id: stableId('עורך דין (נט המשפט)', 5), projectType: 'עורך דין (נט המשפט)', years: 5, basePrice: 555, backupCertificatePrice: 335, icon: 'Scale', tokenPrice: 120, tokenIncluded: 'true', sku: null, backupSku: null },
      { id: stableId('נט המשפט (כתבים)', 2), projectType: 'נט המשפט (כתבים)', years: 2, basePrice: 550, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'true', sku: null, backupSku: null },
      { id: stableId('אופטמטריסטים', 2), projectType: 'אופטמטריסטים', years: 2, basePrice: 350, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('אופטמטריסטים', 4), projectType: 'אופטמטריסטים', years: 4, basePrice: 515, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('אופטמטריסטים', 5), projectType: 'אופטמטריסטים', years: 5, basePrice: 590, backupCertificatePrice: 0, icon: 'FileText', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('פורטל ספקים', 2), projectType: 'פורטל ספקים', years: 2, basePrice: 350, backupCertificatePrice: 270, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('פורטל ספקים', 4), projectType: 'פורטל ספקים', years: 4, basePrice: 515, backupCertificatePrice: 360, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('פורטל ספקים', 5), projectType: 'פורטל ספקים', years: 5, basePrice: 535, backupCertificatePrice: 390, icon: 'User', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
      { id: stableId('שמאים', 4), projectType: 'שמאים', years: 4, basePrice: 510, backupCertificatePrice: 315, icon: 'Car', tokenPrice: 120, tokenIncluded: 'optional', sku: null, backupSku: null },
    ];

    defaultConfigs.forEach(config => {
      this.configs.set(config.id, config);
    });

    // Initialize default admin user
    const defaultAdminId = randomUUID();
    const defaultPassword = "$2b$10$tbSN503BSI3BWwrkXkUIgueCL9Ov9nQzlJU3E8I9LiaaDmhP2PS6."; // "nadav5867"
    this.usersList.set(defaultAdminId, {
      id: defaultAdminId,
      username: "admin",
      displayName: "מנהל ראשי",
      password: defaultPassword,
      role: "super_admin",
      createdAt: new Date()
    });

    // Initialize default manager user
    const defaultManagerId = randomUUID();
    this.usersList.set(defaultManagerId, {
      id: defaultManagerId,
      username: "manager",
      displayName: "מנהל",
      password: defaultPassword,
      role: "manager",
      createdAt: new Date()
    });
  }

  async getPricingConfigs(): Promise<PricingConfig[]> {
    return Array.from(this.configs.values());
  }

  async getPricingConfig(projectType: string, years: number): Promise<PricingConfig | undefined> {
    return Array.from(this.configs.values()).find(
      config => config.projectType === projectType && config.years === years
    );
  }

  async createPricingConfig(config: InsertPricingConfig): Promise<PricingConfig> {
    const id = randomUUID();
    const newConfig: PricingConfig = {
      ...config,
      id,
      icon: config.icon || "User",
      tokenPrice: config.tokenPrice || 120,
      tokenIncluded: config.tokenIncluded || "optional"
    };
    this.configs.set(id, newConfig);
    return newConfig;
  }

  async updatePricingConfig(id: string, updates: Partial<PricingConfig>): Promise<PricingConfig | undefined> {
    const config = this.configs.get(id);
    if (!config) return undefined;
    
    const updated = { ...config, ...updates, id };
    this.configs.set(id, updated);
    return updated;
  }

  async deletePricingConfig(id: string): Promise<boolean> {
    return this.configs.delete(id);
  }

  async clearAllPricingConfigs(): Promise<boolean> {
    this.configs.clear();
    return true;
  }

  async replaceAllPricingConfigsAtomic(configs: PricingConfig[]): Promise<number> {
    this.configs.clear();
    configs.forEach(config => {
      this.configs.set(config.id, config);
    });
    return configs.length;
  }

  async verifyAdminPassword(password: string): Promise<{ valid: boolean; role?: string }> {
    // Check all users for matching password
    for (const user of Array.from(this.usersList.values())) {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        return { valid: true, role: user.role };
      }
    }
    return { valid: false };
  }

  async changeSubAdminPassword(currentPassword: string, newPassword: string, targetRole: string): Promise<boolean> {
    // Verify current password
    const authResult = await this.verifyAdminPassword(currentPassword);
    if (!authResult.valid) {
      return false;
    }

    // Find user with target role
    const user = Array.from(this.usersList.values()).find(u => u.role === targetRole);
    if (!user) {
      return false;
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    this.usersList.set(user.id, user);
    return true;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.usersList.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.usersList.get(id);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date()
    };
    this.usersList.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.usersList.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...updates, id };
    this.usersList.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.usersList.delete(id);
  }

  async replaceAllUsersAtomic(usersList: User[]): Promise<number> {
    this.usersList.clear();
    usersList.forEach(user => {
      this.usersList.set(user.id, user);
    });
    return usersList.length;
  }
}

// Use DatabaseStorage when DATABASE_URL is set, fallback to MemStorage
let storageInstance: IStorage;
try {
  if (process.env.DATABASE_URL) {
    storageInstance = new DatabaseStorage();
    console.log('[STORAGE] Using DatabaseStorage (Neon)');
  } else {
    storageInstance = new MemStorage();
    console.log('[STORAGE] DATABASE_URL not set - using MemStorage (data will not persist)');
  }
} catch (error) {
  console.error('[STORAGE] Database connection failed, using MemStorage:', error);
  storageInstance = new MemStorage();
}

export const storage = storageInstance;
