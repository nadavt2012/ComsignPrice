import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import session from "express-session";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { registerRoutes } from "../server/routes";

const app = express();

// Vercel uses proxies — trust them for accurate IP and proto
app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hidePoweredBy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);

// Compression
app.use(compression({ level: 6, threshold: 1024 }));

// CORS — allow the production domain and Vercel preview URLs
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // health checks / server-to-server
      const allowed = [
        "https://comsignprice.shop",
        "https://www.comsignprice.shop",
      ];
      if (allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  })
);

// HPP + NoSQL injection protection
app.use(hpp({ whitelist: ["years", "certificates"] }));
app.use(mongoSanitize());

// Strict rate limit on auth, general limit on all API
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "יותר מדי נסיונות התחברות. נסה שוב בעוד 15 דקות." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "יותר מדי בקשות. נסה שוב בעוד דקה." },
});

app.use("/api/admin/login", authLimiter);
app.use("/api", apiLimiter);

// Body parsing with size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb", parameterLimit: 20 }));

// Session store — PostgreSQL persists sessions across serverless invocations.
// Falls back to MemoryStore only if DATABASE_URL is missing.
const PgSession = connectPg(session);
const MemStore = MemoryStore(session);
const sessionSecret = process.env.SESSION_SECRET || "ComsignSecureSessionSecret2025$#@!";

const sessionStore = process.env.DATABASE_URL
  ? new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "user_sessions",
      createTableIfMissing: true,
    })
  : new MemStore({ checkPeriod: 86400000 });

app.use(
  session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: "comsign.sid",
    cookie: {
      secure: true,      // Vercel always runs on HTTPS
      httpOnly: true,    // Prevent XSS cookie theft
      sameSite: "lax",   // CSRF protection for same-site; 'none' not needed here
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
      path: "/",
    },
    rolling: true,
  })
);

// Health check (Vercel health monitoring)
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: "vercel",
  });
});

// Register all API routes from the shared routes module.
// Route registration is synchronous even though registerRoutes is async.
registerRoutes(app).catch((err) => {
  console.error("[Vercel] Route registration error:", err);
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message =
    status === 500 ? "שגיאה פנימית בשרת" : err.message || "שגיאה לא צפויה";
  if (!res.headersSent) {
    res.status(status).json({ error: message });
  }
});

export default app;
