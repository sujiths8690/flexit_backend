declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        businessId: number;
        role: string;
      };
    }
  }
}
export {};