import { Router } from 'express';
import { db } from '../../config/db.js';
import type { SliderRow, SocialLinkRow } from '../../database/types.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/response.js';

export const contentRoutes = Router();

contentRoutes.get(
  '/sliders',
  asyncHandler(async (_req, res) => {
    const rows = await db('sliders')
      .where('status', 'active')
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');
    ok(
      res,
      (rows as SliderRow[]).map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        imageUrl: s.image_url,
        imageUrlMobile: s.image_url_mobile,
        buttonText: s.button_text,
        buttonLink: s.button_link,
        sortOrder: s.sort_order,
      })),
    );
  }),
);

contentRoutes.get(
  '/social-links',
  asyncHandler(async (_req, res) => {
    const rows = await db('social_links')
      .where('status', 'active')
      .orderBy('sort_order', 'asc');
    ok(
      res,
      (rows as SocialLinkRow[]).map((s) => ({ id: s.id, platform: s.platform, url: s.url })),
    );
  }),
);
