# Overview

This project is a full-stack TypeScript pricing calculator application designed to calculate prices for various project types (e.g., lawyers, architects, engineers) based on time periods and certificate quantities. It features a React frontend with shadcn/ui and an Express.js backend with PostgreSQL and Drizzle ORM. The application aims to provide a robust, secure, and user-friendly solution for complex pricing calculations, with a focus on accurate date-based validity, credit management, and a highly optimized mobile experience. The business vision is to offer a reliable and efficient tool for professional services pricing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React 18 (TypeScript, Vite)
- **UI Library**: shadcn/ui (Radix UI, Tailwind CSS)
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Styling**: Tailwind CSS (custom design tokens)
- **PWA**: Progressive Web App features with Service Worker for offline functionality and installation.

## Backend
- **Runtime**: Node.js (Express.js)
- **Language**: TypeScript (ES modules)
- **API Design**: RESTful API (JSON responses)
- **Error Handling**: Centralized middleware
- **Authentication**: Session-based with PostgreSQL storage (connect-pg-simple)
- **Authorization**: 2-tier role-based access control (Super Admin, Manager)
- **Security**: Brute force protection, SQL injection prevention (Drizzle ORM + Zod), XSS/CSRF protection, secure cookie configuration, secrets management.

## Data Storage
- **Database**: PostgreSQL (Neon serverless driver)
- **ORM**: Drizzle ORM for type-safe operations
- **Migrations**: Drizzle Kit
- **Fallback**: In-memory storage for development.

## UI/UX & Design
- Clean, professional design with red-themed branding (matching Comsign logo).
- Optimized for mobile and desktop, including responsive layouts, touch targets, and performance optimizations.
- Professional favicon and social sharing optimization (Open Graph, Twitter Cards).
- Dynamic icon system for project types.
- Grouped project display for clarity.
- **Interactive Year Selection**: Grid-based card layout (2-4 cards per project) replacing dropdown, showing both duration and pricing.
- **Potential Savings Display**: Visual indicator showing total savings (per-certificate difference × backup quantity) for both simple and advanced calculators.
- **Advanced Calculator Modal**: 
  - **Auto-Calculate**: Real-time price calculation with 500ms debounce - updates automatically as you type
  - **Enhanced Input Controls**: Quick +/- buttons for fast data entry alongside number inputs  
  - **Live Price Display**: Shows total price, savings, and certificate count instantly within the modal
  - **Dual Layout**: Card-based view for mobile, table view for desktop
  - **Smart UX**: Clear labeling ("תעודה בכרטיס" vs "תעודה + טוקן"), disabled state for unavailable backups
  - **Improved Flow**: "אישור והמשך" button transfers result to main screen (fixes 0-price bug)

## Technical Implementations
- **Pricing Logic**: Advanced date-based validity offset calculations for certificate refunds/credits, accurate token pricing, and multi-year pricing forms.
- **Performance**: Instant auto-calculation, 5-minute intelligent caching, hardware acceleration.
- **Deployment**: Automatic version numbering for deployments (e.g., `v3.0.2`), with a script to generate versions and a React hook to display them.
- **Security Headers**: Strict CSP, COEP/COOP/CORP, certificate transparency, permissions policies.

# External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm** & **drizzle-kit**: ORM and database toolkit.
- **@tanstack/react-query**: Server state management.
- **wouter**: React router.
- **zod**: Runtime type validation.
- **@radix-ui/***: UI primitives.
- **tailwindcss**: CSS framework.
- **class-variance-authority**: Component variants.
- **lucide-react**: Icon library.
- **vite**: Build tool.
- **tsx**: TypeScript execution engine.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Google Fonts**: Web font hosting (Architects Daughter, DM Sans, Fira Code, Geist Mono).