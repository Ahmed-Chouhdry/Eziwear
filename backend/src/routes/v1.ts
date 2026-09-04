import { Router } from 'express';
import { addressRoutes } from '../modules/addresses/address.routes.js';
import { adminRoutes } from '../modules/admin/admin.routes.js';
import { adminProductRoutes } from '../modules/admin/product.routes.js';
import { adminCategoryRoutes } from '../modules/admin/category.routes.js';
import { adminContentRoutes } from '../modules/admin/content.routes.js';
import { adminOrderManagementRoutes } from '../modules/admin/order-management.routes.js';
import { adminMarketingRoutes } from '../modules/admin/marketing.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { cartRoutes } from '../modules/cart/cart.routes.js';
import { catalogRoutes } from '../modules/catalog/catalog.routes.js';
import { contentRoutes } from '../modules/content/content.routes.js';
import { healthRoutes } from '../modules/health/health.routes.js';
import { orderRoutes } from '../modules/orders/order.routes.js';
import { reviewRoutes } from '../modules/reviews/review.routes.js';
import { uploadRoutes } from '../modules/uploads/upload.routes.js';
import { wishlistRoutes } from '../modules/wishlist/wishlist.routes.js';

/**
 * API v1 router.
 * Feature routers are mounted here as each phase lands:
 *   Phase 4  auth        →  /auth
 *   Phase 6  catalog     →  /categories, /products
 *   Phase 8  cart        →  /cart
 *   Phase 9  checkout    →  /checkout, /orders
 *   Phase 12 admin       →  /admin/*
 */
export const v1Router = Router();

v1Router.use(healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use(catalogRoutes);
v1Router.use(contentRoutes);
v1Router.use(reviewRoutes);
v1Router.use(cartRoutes);
v1Router.use(addressRoutes);
v1Router.use(orderRoutes);
v1Router.use(wishlistRoutes);
v1Router.use(adminRoutes);
v1Router.use(adminProductRoutes);
v1Router.use(adminCategoryRoutes);
v1Router.use(adminContentRoutes);
v1Router.use(adminOrderManagementRoutes);
v1Router.use(adminMarketingRoutes);
v1Router.use(uploadRoutes);

v1Router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: { name: 'EZiWear API', version: 'v1', docs: '/api/v1/health' },
  });
});