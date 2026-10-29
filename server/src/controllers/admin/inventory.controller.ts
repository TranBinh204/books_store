import type { Request, Response } from 'express';
import type { InventoryLogQuery } from '../../schemas/inventory.schema';
import * as inventoryService from '../../services/inventory.service';
import { sendSuccess } from '../../utils/response';

export async function listLogs(req: Request, res: Response) {
  const { items, meta } = await inventoryService.listLogs(
    req.query as unknown as InventoryLogQuery,
  );
  return sendSuccess(res, items, 200, meta);
}
