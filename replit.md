# Overview

This is a pricing calculator application built with a full-stack TypeScript architecture. The application allows users to calculate prices for different project types (lawyers, architects, engineers, magna, regular) based on varying time periods and certificate quantities. It features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration using Drizzle ORM.

**Recent Updates (August 2025):**
- Converted to Progressive Web App (PWA) for mobile installation
- **MAXIMIZED Mobile UX/UI Experience**: Complete mobile optimization with 56px touch targets, scale animations, improved responsive design across all components
- **Enhanced Admin Panel**: Full mobile optimization with larger buttons, improved dialogs, and better touch interaction
- **Advanced Mobile Features**: Prevented zoom on input focus, improved font rendering, webkit optimizations, and smooth touch animations
- **Professional Icon System**: Added customizable icon selection for each project type with clean red-themed design
- **Multi-Year Pricing Forms**: Advanced forms supporting up to 10 years with different base and backup certificate prices
- **Advanced Calculation System**: Date-based validity offset calculations for certificate refunds/credits based on remaining days
- **Refined UX/UI**: Clean professional design with red-themed settings gear icon, symmetric layouts, gradient buttons with shadows
- Performance optimizations including debouncing, caching, and hardware acceleration
- Service Worker implementation for offline functionality
- Custom Comsign logo integration with proper mobile display
- Security improvements with environment variable-based admin authentication

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
- **Security**: No authentication currently implemented - appears to be a public calculator tool

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