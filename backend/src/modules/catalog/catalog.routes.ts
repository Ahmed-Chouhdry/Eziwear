import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { catalogController } from './catalog.controller.js';
import {
  productQuerySchema,
  sectionParamSchema,
  sectionQuerySchema,
  slugParamSchema,
} from './catalog.schemas.js';

export const catalogRoutes = Router();

catalogRoutes.get('/categories', catalogController.categories);

catalogRoutes.get(
  '/products',
  validate({ query: productQuerySchema }),
  catalogController.products,
);

catalogRoutes.get('/products/filters', catalogController.filterOptions);

catalogRoutes.get(
  '/products/sections/:section',
  validate({ params: sectionParamSchema, query: sectionQuerySchema }),
  catalogController.section,
);

catalogRoutes.get(
  '/products/:slug/related',
  validate({ params: slugParamSchema, query: sectionQuerySchema }),
  catalogController.related,
);

catalogRoutes.get(
  '/products/:slug',
  validate({ params: slugParamSchema }),
  catalogController.productBySlug,
);
