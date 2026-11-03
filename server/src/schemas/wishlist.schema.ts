import { z } from 'zod';
import { idSchema, paginationQuerySchema } from './common.schema';

// Sách yêu thích — docs/03-modules/09-wishlist.md

export const wishlistQuerySchema = paginationQuerySchema;

export const wishlistBookParamSchema = z.object({ bookId: idSchema });

export type WishlistQuery = z.infer<typeof wishlistQuerySchema>;
