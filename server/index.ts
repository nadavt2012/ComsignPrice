import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import compression from "compression";
import winston from "winston";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createHmac } from "crypto";

// Environment variables for auto-sync
// Only enable auto-sync in development environment by default
const defaultAutoSync = process.env.NODE_ENV === 'development' ? "true" : "false";
process.env.ENABLE_AUTO_SYNC = process.env.ENABLE_AUTO_SYNC || defaultAutoSync;

// Set sync defaults only for development - production requires explicit configuration
if (process.env.NODE_ENV === 'development') {
  process.env.SYNC_SECRET = process.env.SYNC_SECRET || "ComsignAutoSyncSecretKey2024$#@!XyZ123456789";
  process.env.PROD_SYNC_URL = process.env.PROD_SYNC_URL || "https://comsignprice.shop/internal/sync/full";
}

// Global type declaration for sync trigger
declare global {
  var triggerSync: () => void;
}

const app = express();

// Configure Winston Logger (2025 Standard)
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'comsign-pricing' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Advanced Security Headers with Helmet (2025 Configuration)
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isProduction 
        ? ["'self'"] 
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: isProduction 
        ? ["'self'", "https://fonts.googleapis.com"] 
        : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: isProduction 
        ? ["'self'", "https://api.comsignprice.shop"] 
        : ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Enhanced 2025 Security Features
  hidePoweredBy: true,
  ieNoOpen: true,
  dnsPrefetchControl: { allow: false },
  permittedCrossDomainPolicies: false,
  crossOriginEmbedderPolicy: isProduction,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  originAgentCluster: true
}));

// Maximum Security Headers (2025 Standard)
app.use((req, res, next) => {
  // Critical security headers for maximum protection
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Expect-CT', 'max-age=86400, enforce'); // Certificate transparency
  res.setHeader('Feature-Policy', 
    'camera \'none\'; microphone \'none\'; geolocation \'none\'; payment \'none\'; usb \'none\'');
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=()');
  
  // Remove server information leakage
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  
  if (isProduction) {
    // Production-only maximum security
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  
  next();
});

// Advanced GZIP Compression (2025 Best Practice - Brotli via CDN/Proxy)
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress files > 1KB
  filter: (req: express.Request, res: express.Response) => {
    // Don't compress if the request includes a Cache-Control no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    // Skip compression for images and videos - they're already compressed
    const contentType = res.getHeader('content-type') as string;
    if (contentType && (contentType.includes('image/') || contentType.includes('video/'))) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// CORS Configuration (2025 Security Standard - Production Ready with Health Check Support)
const corsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void, req?: express.Request) {
    // Production vs Development security
    if (process.env.NODE_ENV === 'production') {
      // Get allowed origins from environment variables
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
      const productionDomain = process.env.PRODUCTION_DOMAIN;
      const customDomain = process.env.CUSTOM_DOMAIN;
      
      // Combine all allowed origins
      const productionOrigins = [...allowedOrigins];
      if (productionDomain) productionOrigins.push(productionDomain);
      if (customDomain) productionOrigins.push(customDomain);
      
      // Add default Replit app domains as fallback
      if (!productionDomain && !customDomain && allowedOrigins.length === 0) {
        logger.info('No specific origins configured, allowing all .replit.app and .replit.co domains and comsignprice.shop');
        // Allow all Replit published domains and comsignprice.shop as fallback
        if (origin && (origin.endsWith('.replit.app') || origin.endsWith('.replit.co') || origin.includes('.replit.') || origin === 'https://comsignprice.shop')) {
          return callback(null, true);
        }
      }
      
      // Allow requests with no origin for health checks and deployment monitoring
      // Health check requests often don't include origin headers
      if (!origin) {
        // Allow origin-less requests for health checks and API calls that don't require credentials
        return callback(null, true);
      }
      
      if (productionOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.error(`CORS blocked unauthorized origin in production: ${origin}`, { 
          timestamp: new Date().toISOString(),
          severity: 'HIGH',
          allowedOrigins: productionOrigins
        });
        callback(new Error(`Origin '${origin}' not allowed by production CORS policy`), false);
      }
    } else {
      // Development - more permissive but still secure
      const devOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000',
        'https://comsignprice.shop'
      ];
      
      const replitPattern = /^https:\/\/[a-f0-9-]+.*\.replit\.(dev|app)$/;
      
      // Allow requests with no origin (mobile apps, Postman, etc.) in development
      if (!origin) {
        return callback(null, true);
      }
      
      if (devOrigins.includes(origin) || replitPattern.test(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin in development: ${origin}`, { 
          timestamp: new Date().toISOString()
        });
        callback(new Error('Not allowed by development CORS policy'), false);
      }
    }
  },
  credentials: process.env.NODE_ENV === 'development', // Disable credentials in production unless needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight for 24 hours
};

// Apply CORS only to API routes, leaving health checks unrestricted for deployment monitoring
app.use('/api', cors(corsOptions));

// HTTP Parameter Pollution Protection
app.use(hpp({
  whitelist: ['years', 'certificates'] // Allow arrays for these params
}));

// NoSQL Injection Protection
app.use(mongoSanitize());

// Advanced Multi-Tier Rate Limiting (2025 Standard)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'יותר מדי בקשות מכתובת IP זו. נסה שוב בעוד 15 דקות.',
    retryAfter: '15 minutes'
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'יותר מדי בקשות מכתובת IP זו. נסה שוב בעוד 15 דקות.',
      retryAfter: '15 minutes'
    });
  }
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'יותר מדי נסיונות התחברות. נסה שוב בעוד 15 דקות.',
    retryAfter: '15 minutes'
  }
});

// API endpoint rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'יותר מדי בקשות API. נסה שוב בעוד דקה.',
    retryAfter: '1 minute'
  }
});

// Apply rate limiters
app.use(globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Health check endpoints for deployment monitoring - no CORS restrictions needed
// These endpoints support deployment health checks and monitoring without origin validation
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).send("OK");
});

app.get('/ready', (req, res) => {
  res.status(200).json({
    status: "ready",
    timestamp: new Date().toISOString()
  });
});

// Root route is handled by Vite in development or static serving in production
// Health checks are available at /health, /healthz, and /ready endpoints

// Secure body parsing with size limits
app.use(express.json({ 
  limit: '1mb', // Increased for better UX while maintaining security
  verify: (req: express.Request, res: express.Response, buf: Buffer) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      logger.warn(`Invalid JSON from IP: ${req.ip || 'unknown'}`);
      throw new Error('Invalid JSON payload');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: false, 
  limit: '1mb',
  parameterLimit: 20 // Prevent parameter pollution
}));

// Memory Optimization Middleware (2025 Standard)
app.use((req, res, next) => {
  // Force garbage collection every 100 requests (if available)
  if (global.gc && Math.random() < 0.01) {
    global.gc();
  }
  
  // Monitor memory usage in development
  if (process.env.NODE_ENV === 'development') {
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 100 * 1024 * 1024) { // > 100MB
      logger.warn('High memory usage detected', {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      });
    }
  }
  
  next();
});

// Enhanced Request Logging with Winston (2025 Standard)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    
    if (path.startsWith("/api")) {
      // Use Winston for structured logging
      logger.info('API Request', {
        method: req.method,
        path,
        status: res.statusCode,
        duration,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent')?.slice(0, 100) || 'unknown',
        responseSize: JSON.stringify(capturedJsonResponse || {}).length
      });

      // Keep legacy simple log for console (development)
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Secure Error Handler (2025 Standard - No Double Response/Throw)
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = status === 500 ? "שגיאה פנימית בשרת" : (err.message || "שגיאה לא צפויה");

    // Log error with context for debugging
    logger.error('Request error', {
      status,
      message: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Only send response if headers not already sent
    if (!res.headersSent) {
      res.status(status).json({ 
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    }
    
    // Log but don't rethrow - prevents process crashes
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    const bootTime = Date.now();
    const currentMemory = process.memoryUsage();
    
    log(`🚀 Server ready on port ${port}`);
    logger.info('Server startup complete', {
      port,
      memoryUsage: {
        heap: `${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(currentMemory.external / 1024 / 1024)}MB`
      },
      nodeVersion: process.version,
      environment: process.env.NODE_ENV
    });
    
    // Set up periodic memory monitoring
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const mem = process.memoryUsage();
        if (mem.heapUsed > 150 * 1024 * 1024) { // > 150MB warning
          logger.warn('Memory threshold exceeded', {
            heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`
          });
        }
      }, 300000); // Check every 5 minutes
    }
    
    // Initialize auto-sync system only in development and when explicitly enabled
    // This prevents background processes in production that could interfere with Autoscale
    // TEMPORARY FIX: Force enable auto-sync for urgent production data sync
    if (process.env.NODE_ENV === 'development') {
      log('[SYNC] 🔧 Force enabling auto-sync for production data sync');
      initializeAutoSync();
    } else if (process.env.NODE_ENV === 'production') {
      log('[SYNC] Auto-sync disabled in production to prevent background processes');
    }
  });

  // Graceful shutdown for deployment environments
  const gracefulShutdown = (signal: string) => {
    log(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      log('Forced shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();

// Auto-sync system for pushing changes to production
let syncInProgress = false;
let lastSyncAttempt = 0;
const SYNC_RETRY_DELAY = 30000; // 30 seconds
const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MAX_RETRIES = 3;

async function publishSync(retryCount = 0): Promise<boolean> {
  if (syncInProgress) {
    log('[SYNC] Sync already in progress, skipping');
    return false;
  }

  const now = Date.now();
  if (now - lastSyncAttempt < SYNC_RETRY_DELAY) {
    log('[SYNC] Too soon to retry, waiting');
    return false;
  }

  const prodSyncUrl = process.env.PROD_SYNC_URL;
  const syncSecret = process.env.SYNC_SECRET;

  if (!prodSyncUrl || !syncSecret) {
    if (retryCount === 0) {
      log('[SYNC] Missing PROD_SYNC_URL or SYNC_SECRET environment variables');
    }
    return false;
  }

  syncInProgress = true;
  lastSyncAttempt = now;

  try {
    // Get all current pricing configs
    const { storage } = await import('./storage');
    const configs = await storage.getPricingConfigs();
    
    // Always sync, even if empty (to clear production when dev is empty)
    log(`[SYNC] Syncing ${configs.length} configs to production...`);
    if (configs.length === 0) {
      log('[SYNC] Empty sync - will clear production to match development');
    }

    // Create HMAC signature
    const timestamp = Date.now().toString();
    const payload = { configs };
    const rawBody = JSON.stringify(payload);
    const signature = createHmac('sha256', syncSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    // Send sync request
    log(`[SYNC] Attempting to sync ${configs.length} configs to production...`);
    
    const response = await fetch(prodSyncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Signature': signature,
        'X-Sync-Timestamp': timestamp
      },
      body: rawBody
    });

    if (response.ok) {
      const result = await response.json();
      log(`[SYNC] ✅ Success: ${result.message || 'Synced successfully'}`);
      syncInProgress = false;
      return true;
    } else {
      const errorText = await response.text();
      log(`[SYNC] ❌ Failed with status ${response.status}: ${errorText}`);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        log(`[SYNC] Retrying in ${SYNC_RETRY_DELAY/1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => {
          publishSync(retryCount + 1);
        }, SYNC_RETRY_DELAY);
      }
      
      syncInProgress = false;
      return false;
    }
  } catch (error) {
    log(`[SYNC] ❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      log(`[SYNC] Retrying in ${SYNC_RETRY_DELAY/1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => {
        publishSync(retryCount + 1);
      }, SYNC_RETRY_DELAY);
    }
    
    syncInProgress = false;
    return false;
  }
}

function initializeAutoSync() {
  log('[SYNC] 🚀 Auto-sync system initialized');
  
  // Initial sync on startup
  setTimeout(() => {
    log('[SYNC] Performing initial sync...');
    publishSync();
  }, 5000); // Wait 5 seconds for server to be fully ready

  // Periodic sync every 10 minutes
  setInterval(() => {
    log('[SYNC] Performing periodic sync...');
    publishSync();
  }, SYNC_INTERVAL);
}

// Export for use in routes - only enable in development or when explicitly allowed
global.triggerSync = () => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PROD_SYNC !== 'true') {
    log('[SYNC] Sync disabled in production environment');
    return;
  }
  
  log('[SYNC] Triggered by data change');
  // Add small delay to batch rapid changes
  setTimeout(() => publishSync(), 2000);
};
