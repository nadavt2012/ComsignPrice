import express, { type Request, Response, NextFunction } from "express";
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

// Security headers and cache control
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Cache control for development - prevent browser caching
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', Math.random().toString(36));
  }
  
  // Only add CSP in production to avoid dev issues
  if (app.get("env") === "production") {
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;");
  }
  
  next();
});

// Rate limiting for API endpoints in production
if (process.env.NODE_ENV === 'production') {
  const rateLimit = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    requests: new Map()
  };
  
  app.use('/api', (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const userRequests = rateLimit.requests.get(ip) || { count: 0, resetTime: now + rateLimit.windowMs };
    
    if (now > userRequests.resetTime) {
      userRequests.count = 0;
      userRequests.resetTime = now + rateLimit.windowMs;
    }
    
    if (userRequests.count >= rateLimit.max) {
      return res.status(429).json({ message: 'Too many requests' });
    }
    
    userRequests.count++;
    rateLimit.requests.set(ip, userRequests);
    next();
  });
}

app.use(express.json({ limit: '500kb' })); // Optimized for fast processing
app.use(express.urlencoded({ extended: false, limit: '500kb' }));

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
    log(`serving on port ${port}`);
    
    // Initialize auto-sync system only in development and when explicitly enabled
    // This prevents background processes in production that could interfere with Autoscale
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_AUTO_SYNC === 'true') {
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
