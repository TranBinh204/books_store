import { z } from 'zod';
import { BOOK_MAX_SELECT_QUANTITY } from './book-public.schema';
import { idSchema } from './common.schema';

// Giỏ hàng — docs/03-modules/05-cart.md

/** Số đầu sách tối đa trong 1 giỏ */
export const CART_MAX_ITEMS = 50;

const quantitySchema = z
  .number({ error: 'Số lượng không hợp lệ' })
  .int('Số lượng không hợp lệ')
  .min(1, 'Số lượng tối thiểu là 1')
  .max(BOOK_MAX_SELECT_QUANTITY, `Số lượng tối đa là ${BOOK_MAX_SELECT_QUANTITY}`);

const cartLineSchema = z.object({ bookId: idSchema, quantity: quantitySchema });

/** Danh sách dòng giỏ (giỏ của khách gửi lên để xem trước / gộp khi đăng nhập) */
export const cartLinesSchema = z.object({
  items: z.array(cartLineSchema).max(CART_MAX_ITEMS, `Giỏ hàng tối đa ${CART_MAX_ITEMS} sản phẩm`),
});

export const addCartItemSchema = cartLineSchema;

export const updateCartItemSchema = z.object({ quantity: quantitySchema });

export const bookIdParamSchema = z.object({ bookId: idSchema });

export type CartLineInput = z.infer<typeof cartLineSchema>;
