import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      role: string;
      username?: string;
      lastLogin: string;
    };
  }
}
