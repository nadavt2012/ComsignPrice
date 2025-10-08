# Overview

This is a pricing calculator application built with a full-stack TypeScript architecture. The application allows users to calculate prices for different project types (lawyers, architects, engineers, magna, regular) based on varying time periods and certificate quantities. It features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration using Drizzle ORM.

**Recent Updates (October 2025):**
- **Critical Date Calculation Fix**: Fixed advanced calculation date logic to work perfectly with any date range
  - **Previous Bug**: System calculated days from TODAY to end date, causing errors with past/future dates
  - **New Logic**: Correctly calculates days between user-entered START and END dates (inclusive)
  - **Accurate Counting**: Includes both start and end dates (e.g., Jan 1-5 = 5 days, not 4)
  - **Leap Year Support**: Properly handles leap years (e.g., 2024-01-01 to 2024-12-31 = 366 days)
  - **Validation**: Prevents invalid ranges (end date must be >= start date) with clear error messages
- **Enhanced Branding & SEO**: Professional favicon and social sharing optimization
  - **Multi-Size Favicon System**: Complete favicon implementation (16x16, 32x32, 48x48, ico format) with red calculator icon
  - **Apple Touch Icon**: Dedicated 180x180 iOS home screen icon for PWA installation
  - **Open Graph Meta Tags**: Full social sharing support (Facebook, LinkedIn) with Hebrew locale support
  - **Twitter Card Integration**: Large image cards for professional Twitter/X sharing
  - **Red-Themed Icons**: Consistent branding with #ef4444 red borders matching Comsign logo design
- **Critical Security Hardening**: Comprehensive security audit and fixes to prevent vulnerabilities and unauthorized access
  - **Session-Based Authentication**: PostgreSQL-backed sessions with secure cookies (HttpOnly, Secure in production, SameSite=strict)
  - **Brute Force Protection**: Rate limiting on login endpoint (5 attempts per 15 minutes)
  - **SQL Injection Prevention**: Drizzle ORM parameterized queries + Zod validation on all routes
  - **XSS Protection**: No dangerouslySetInnerHTML or innerHTML usage throughout application
  - **CSRF Protection**: SameSite=strict cookies preventing cross-site request forgery
  - **Secrets Management**: Removed all hard-coded passwords, ENV fallbacks, and password logging
  - **Authentication Middleware**: All 17 admin endpoints protected with role-based access control
  - **Deprecated Functions Cleanup**: Removed updateAdminPassword and resetAdminPassword (replaced by user management)

**Previous Updates (September 2025):**
- **Critical Bug Fix**: Fixed frontend price display issue where calculations weren't showing on published website despite API working correctly
- **Auto-Version System**: Implemented automatic version numbering for deployments with simple incrementing numbers (format: v3.0.2, v3.0.3, etc.)
- **Version Tracking**: Added `scripts/generate-version.js` script and `useVersion` React hook for dynamic version display and deployment tracking
- **Design Cleanup**: Removed heavy border-2 styling framework for cleaner, minimal visual design with subtle borders and shadows
- **Desktop Layout Optimization**: Compressed spacing and layout elements to ensure complete dashboard visibility without vertical scrolling
- **Maximum HTTP Security (2025 Standards)**: Enhanced with strict CSP, COEP/COOP/CORP headers, certificate transparency, permissions policies, and production-ready CORS with exact origin matching

**Previous Updates (August 2025):**
- Converted to Progressive Web App (PWA) for mobile installation
- **MAXIMIZED Mobile UX/UI Experience**: Complete mobile optimization with 56px touch targets, scale animations, improved responsive design across all components
- **Enhanced Admin Panel**: Full mobile optimization with larger buttons, improved dialogs, and better touch interaction
- **Advanced Mobile Features**: Prevented zoom on input focus, improved font rendering, webkit optimizations, and smooth touch animations
- **Professional Icon System**: Added customizable icon selection for each project type with clean red-themed design
- **Multi-Year Pricing Forms**: Advanced forms supporting up to 10 years with different base and backup certificate prices
- **Advanced Calculation System**: Date-based validity offset calculations for certificate refunds/credits based on remaining days, with accurate token pricing per certificate (not per project)
- **Refined UX/UI**: Clean professional design with red-themed settings gear icon, symmetric layouts, gradient buttons with shadows
- **Desktop Compatibility**: Enhanced responsive design for large screens (lg: 1024px+, xl: 1280px+) with larger fonts and improved spacing
- **Dynamic Project Management**: Complete database integration with PostgreSQL for persistent data storage
- **Real-time Synchronization**: Admin panel changes instantly reflect in main calculator interface using React Query cache invalidation
- **Grouped Project Display**: Projects with same names are grouped together showing sub-projects by years in organized view
- **Production-Ready Performance**: Advanced optimizations including 150ms debouncing, 5-minute intelligent caching, hardware acceleration for all devices (mobile/tablet/desktop)
- **Comprehensive PWA**: Complete Service Worker implementation for offline functionality and app installation
- **Enhanced Security**: Production security headers, rate limiting, payload size limits, and comprehensive XSS/CSRF protection
- **Professional Branding**: Custom Comsign logo integration with proper mobile display and red-themed design consistency
- **Advanced Permission System**: 2-tier role-based access control (Super Admin + Manager) with password management capabilities
- **Ready for Deployment**: Complete build system, security checklist, and production-ready configuration

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Error Handling**: Centralized error middleware with standardized error responses
- **Development**: Hot reloading with tsx and Vite integration for development mode

## Data Storage
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Migrations**: Drizzle Kit for schema migrations and database management
- **Fallback Storage**: In-memory storage implementation for development/testing with pre-seeded pricing data

## Authentication & Authorization
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL session storage
- **Multi-Level Access Control**: 2-tier permission system with role-based authentication
  - **Super Admin (ADMIN_PASSWORD)**: Full control including price management, deletion, and password management for other roles
  - **Manager (MANAGER_PASSWORD)**: Price editing capabilities only, cannot delete projects or manage passwords
- **Password Management**: Super admins can generate new passwords for managers directly from the admin panel
- **Security**: Environment variable based authentication with role verification and audit logging

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity for serverless environments
- **drizzle-orm** & **drizzle-kit**: Type-safe ORM and database toolkit
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router
- **zod**: Runtime type validation and schema parsing

### UI Dependencies
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe utility for creating component variants
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool and development server
- **tsx**: TypeScript execution engine for Node.js
- **@replit/vite-plugin-***: Replit-specific development plugins

### Third-Party Integrations
- **Neon Database**: Serverless PostgreSQL hosting platform
- **Google Fonts**: Web font hosting (Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Replit Development Banner**: Development environment integration

The application uses environment variables for database configuration and supports both development and production deployment modes with appropriate build optimizations.

## Production Deployment Requirements

### Required Environment Variables for Production

For successful production deployment, the following environment variables MUST be configured:

**Core Application Settings:**
- `NODE_ENV=production` - Enables production mode with enhanced security
- `PORT=5000` - Application port (default: 5000, required by Replit)

**CORS Security Configuration:**
- `ALLOWED_ORIGINS` - Comma-separated list of allowed frontend origins (e.g., "https://yourapp.replit.app,https://yourdomain.com")
- `PRODUCTION_DOMAIN` - Primary production domain (e.g., "https://yourapp.replit.app")
- `CUSTOM_DOMAIN` - Optional custom domain if configured (e.g., "https://yourdomain.com")

**Database Configuration:**
- `DATABASE_URL` - PostgreSQL connection string (automatically provided by Replit)

**Authentication Secrets:**
- `ADMIN_PASSWORD` - Super admin password for full system access
- `MANAGER_PASSWORD` - Manager password for price editing capabilities

**Optional Auto-Sync Settings (Development Only):**
- `ENABLE_AUTO_SYNC=false` - Should be disabled in production
- `SYNC_SECRET` - Only used in development for syncing to production
- `PROD_SYNC_URL` - Only used in development for syncing to production

### CORS Configuration Notes

The application includes health check endpoints (`/health`, `/healthz`, `/ready`, `/`) that bypass CORS validation to support deployment health monitoring. However, for all other API endpoints, proper CORS configuration is essential.

**Important:** If CORS environment variables are not properly configured, the deployment will fail with "Origin required in production" errors during health checks and API calls.

## Publishing and Synchronization

### Replit Publishing Limitations

The Replit platform has an important limitation regarding published websites:

- **Published websites are snapshots**: When you publish your app, Replit creates a static snapshot of your current code and deploys it separately from your development environment
- **No automatic synchronization**: Changes made in the development environment do not automatically update the published website
- **Manual republishing required**: To reflect development changes in production, you must manually republish your app through the Replit interface

### Current Auto-Sync System

The application includes an automatic database synchronization system that works between development and production:
- Synchronizes pricing configuration data every time the development server starts
- Updates 28+ project configurations automatically 
- Only syncs database content, not application code or UI changes
- Confirmed working via server logs: `[SYNC] ✅ Success: עודכנו בהצלחה 28 פרויקטים`

### Recommended Workflow for Production Updates

The application now includes automatic version tracking for every deployment:

1. **Test in Development**: Make and test all changes in the development environment
2. **Verify Functionality**: Ensure calculations, UI, and all features work correctly  
3. **Generate New Version**: Run `node scripts/generate-version.js` to create a unique version for this deployment
4. **Deploy via Autoscale**: Use the Replit "Redeploy" button to update the production website
5. **Verify Production**: Check that changes are live on the published URL and verify the new version number appears at the bottom of the calculator

**Automatic Version Generation:**
- Each deployment creates a unique version number in format: `v3.0.2`, `v3.0.3`, etc.
- Version is automatically displayed at the bottom of the calculator interface
- Helps track which changes are live on the production website
- No need to manually update version numbers in code

### Future Enhancement Options

Consider these alternatives for more automated deployment:
- **Replit Deployments**: Migrate from "Publish" to Replit's deployment system which may offer better automation
- **External CI/CD**: Set up GitHub Actions or similar to trigger Replit deployments
- **Custom Sync Script**: Develop a webhook-based system to trigger republishing programmatically