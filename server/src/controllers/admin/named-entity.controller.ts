import type { Request, Response } from 'express';
import type { NamedEntityBody, NamedEntityListQuery } from '../../schemas/named-entity.schema';
import type { NamedEntityService } from '../../services/named-entity.service';
import { sendSuccess } from '../../utils/response';

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

/** Controller dùng chung cho tác giả & nhà xuất bản */
export function createNamedEntityController(service: NamedEntityService) {
  return {
    async list(req: Request, res: Response) {
      const { q, page, limit } = req.query as unknown as NamedEntityListQuery;
      const { items, meta } = await service.list(q, { page, limit });
      return sendSuccess(res, items, 200, meta);
    },

    async create(req: Request, res: Response) {
      return sendSuccess(res, await service.create((req.body as NamedEntityBody).name), 201);
    },

    async rename(req: Request, res: Response) {
      return sendSuccess(res, await service.rename(idOf(req), (req.body as NamedEntityBody).name));
    },

    async remove(req: Request, res: Response) {
      await service.remove(idOf(req));
      return res.status(204).end();
    },
  };
}
