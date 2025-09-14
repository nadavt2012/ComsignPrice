# Overview

This is a pricing calculator application built with a full-stack TypeScript architecture. The application allows users to calculate prices for different project types (lawyers, architects, engineers, magna, regular) based on varying time periods and certificate quantities. It features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration using Drizzle ORM.

**Recent Updates (September 2025):**
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