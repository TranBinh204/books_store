import { Router } from 'express';
import { createNamedEntityController } from '../../controllers/admin/named-entity.controller';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../schemas/common.schema';
import {
  namedEntityBodySchema,
  namedEntityListQuerySchema,
} from '../../schemas/named-entity.schema';
import {
  authorService,
  publisherService,
  type NamedEntityService,
} from '../../services/named-entity.service';
import { asyncHandler } from '../../utils/asyncHandler';

function createNamedEntityRouter(service: NamedEntityService) {
  const controller = createNamedEntityController(service);
  const router = Router();

  router.get('/', validate({ query: namedEntityListQuerySchema }), asyncHandler(controller.list));
  router.post('/', validate({ body: namedEntityBodySchema }), asyncHandler(controller.create));
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: namedEntityBodySchema }),
    asyncHandler(controller.rename),
  );
  router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(controller.remove));

  return router;
}

export const authorRoutes = createNamedEntityRouter(authorService);
export const publisherRoutes = createNamedEntityRouter(publisherService);
