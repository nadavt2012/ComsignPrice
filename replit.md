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
- **Database**: PostgreSQL (Neon serverless driver) - Currently using MemStorage with production data
- **ORM**: Drizzle ORM for type-safe operations
- **Migrations**: Drizzle Kit
- **Current Mode**: In-memory storage (MemStorage) loaded with 28 production project configurations from backup files (production_import.sql, export_projects.sql).
- **Project Types (12 total)**: מע״מ (ממשל זמין), אדריכלים (רישוי זמין), משרד העבודה ורווחה, בריאות (שקדיה), שע״מ, מכס (שער עולמי), מגנא, עורך דין (נט המשפט), נט המשפט (כתבים), אופטמטריסטים, פורטל ספקים, שמאים.

## UI/UX & Design
- Clean, professional design with red-themed branding (matching Comsign logo).
- Optimized for mobile and desktop, including responsive layouts, touch targets, and performance optimizations.
- Professional favicon and social sharing optimization (Open Graph, Twitter Cards).
- Dynamic icon system for project types.
- Grouped project display for clarity.
- **RTL Support**: Full right-to-left text alignment for Hebrew content throughout the application.
- **Interactive Year Selection**: Grid-based card layout (2-4 cards per project) replacing dropdown, showing both duration and pricing.
- **Potential Savings Display**: Visual indicator showing total savings (per-certificate difference × backup quantity) for both simple and advanced calculators.
- **Token Display**: Purple information box showing exact number of tokens added and their cost (₪120 each when not included in base price).
- **Advanced Calculator Modal**: 
  - **Auto-Calculate**: Real-time price calculation with 500ms debounce - updates automatically as you type
  - **Enhanced Input Controls**: Quick +/- buttons for fast data entry alongside number inputs  
  - **Live Price Display**: Shows total price, savings, token count, and token cost instantly within the modal
  - **Dual Layout**: Card-based view for mobile, table view for desktop
  - **Smart UX**: Clear labeling ("תעודה בכרטיס" vs "תעודה + טוקן"), disabled state for unavailable backups
  - **Improved Flow**: "אישור והמשך" button transfers result to main screen with persistent display
  - **Result Persistence**: Advanced calculation results persist on main screen until manually changed

## Technical Implementations
- **Pricing Logic**: 
  - Advanced date-based validity offset calculations for certificate refunds/credits
  - Accurate token pricing with support for three states: included (`tokenIncluded="true"`), not included (`tokenIncluded="false"`), and optional (`tokenIncluded="optional"`)
  - Multi-year pricing forms with per-project configuration
  - **Savings calculation**: Based ONLY on base price difference (regular vs backup), excluding token costs. Token selection affects final price but NOT potential savings amount.
- **Token Tracking**: 
  - Counts total tokens based on certificate/backup type selection (`certificateType === "token"` or `backupType === "token"`)
  - Calculates token cost only when `tokenIncluded !== "true"` (₪120 per token)
  - Displays token information in purple box with count and cost breakdown
- **Performance**: Instant auto-calculation, 5-minute intelligent caching, hardware acceleration, optimized React re-renders.
- **Deployment**: Automatic version numbering (current: v3.0.21), with a script to generate versions and a React hook to display them.
- **Production Data**: System restored with all 28 original Hebrew project configurations from comsignprice.shop production backup files.
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