export type UserRole = 'CUSTOMER' | 'ADMIN';

declare global {
  namespace Express {
    interface Request {
      /** Gắn bởi middleware requireAuth / optionalAuth */
      user?: { id: number; role: UserRole };
    }
  }
}
