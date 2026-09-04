import { db } from '../../config/db.js';
import type { AdvertisementRow, SliderRow, SocialLinkRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import type {
  CreateAdInput,
  CreateSliderInput,
  CreateSocialLinkInput,
  UpdateAdInput,
  UpdateSliderInput,
  UpdateSocialLinkInput,
} from './content.schemas.js';

export interface AdminSliderDto {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  imageUrlMobile: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export interface AdminAdDto {
  id: number;
  title: string | null;
  description: string | null;
  mediaUrl: string;
  ctaText: string | null;
  ctaLink: string | null;
  position: AdvertisementRow['position'];
  startAt: string | null;
  endAt: string | null;
  status: 'active' | 'inactive';
}

function sliderDto(r: SliderRow): AdminSliderDto {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    imageUrl: r.image_url,
    imageUrlMobile: r.image_url_mobile,
    buttonText: r.button_text,
    buttonLink: r.button_link,
    sortOrder: r.sort_order,
    status: r.status,
  };
}

function adDto(r: AdvertisementRow): AdminAdDto {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    mediaUrl: r.media_url,
    ctaText: r.cta_text,
    ctaLink: r.cta_link,
    position: r.position,
    startAt: r.start_at,
    endAt: r.end_at,
    status: r.status,
  };
}

export interface AdminSocialLinkDto {
  id: number;
  platform: string;
  url: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

function socialLinkDto(r: SocialLinkRow): AdminSocialLinkDto {
  return { id: r.id, platform: r.platform, url: r.url, sortOrder: r.sort_order, status: r.status };
}

async function nextSortOrder(table: 'sliders' | 'social_links'): Promise<number> {
  const max = await db(table).max<{ m: number | null }[]>({ m: 'sort_order' });
  return (max[0]?.m ?? -1) + 1;
}

export const adminSliderService = {
  async list(): Promise<AdminSliderDto[]> {
    const rows = await db('sliders').orderBy('sort_order', 'asc').orderBy('id', 'asc');
    return rows.map(sliderDto);
  },

  async create(input: CreateSliderInput): Promise<AdminSliderDto> {
    const sortOrder = input.sortOrder || (await nextSortOrder('sliders'));
    const [id] = await db('sliders').insert({
      title: input.title ?? null,
      subtitle: input.subtitle ?? null,
      image_url: input.imageUrl,
      image_url_mobile: input.imageUrlMobile ?? null,
      button_text: input.buttonText ?? null,
      button_link: input.buttonLink ?? null,
      sort_order: sortOrder,
      status: input.status,
    });
    const row = await db('sliders').where({ id }).first();
    return sliderDto(row!);
  },

  async update(id: number, input: UpdateSliderInput): Promise<AdminSliderDto> {
    const existing = await db('sliders').where({ id }).first();
    if (!existing) throw ApiError.notFound('Slider not found');

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch['title'] = input.title ?? null;
    if (input.subtitle !== undefined) patch['subtitle'] = input.subtitle ?? null;
    if (input.imageUrl !== undefined) patch['image_url'] = input.imageUrl;
    if (input.imageUrlMobile !== undefined) patch['image_url_mobile'] = input.imageUrlMobile ?? null;
    if (input.buttonText !== undefined) patch['button_text'] = input.buttonText ?? null;
    if (input.buttonLink !== undefined) patch['button_link'] = input.buttonLink ?? null;
    if (input.sortOrder !== undefined) patch['sort_order'] = input.sortOrder;
    if (input.status !== undefined) patch['status'] = input.status;

    if (Object.keys(patch).length) await db('sliders').where({ id }).update(patch);
    const row = await db('sliders').where({ id }).first();
    return sliderDto(row!);
  },

  async move(id: number, direction: 'up' | 'down'): Promise<AdminSliderDto[]> {
    const rows = await db('sliders').orderBy('sort_order', 'asc').orderBy('id', 'asc');
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw ApiError.notFound('Slider not found');
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < rows.length) {
      const a = rows[idx]!;
      const b = rows[swapIdx]!;
      await db.transaction(async (trx) => {
        await trx('sliders').where({ id: a.id }).update({ sort_order: b.sort_order });
        await trx('sliders').where({ id: b.id }).update({ sort_order: a.sort_order });
      });
    }
    const fresh = await db('sliders').orderBy('sort_order', 'asc').orderBy('id', 'asc');
    return fresh.map(sliderDto);
  },

  async remove(id: number): Promise<void> {
    const existing = await db('sliders').where({ id }).first();
    if (!existing) throw ApiError.notFound('Slider not found');
    await db('sliders').where({ id }).del();
  },
};

export const adminAdService = {
  async list(): Promise<AdminAdDto[]> {
    const rows = await db('advertisements').orderBy('id', 'desc');
    return rows.map(adDto);
  },

  async create(input: CreateAdInput): Promise<AdminAdDto> {
    const [id] = await db('advertisements').insert({
      title: input.title ?? null,
      description: input.description ?? null,
      media_url: input.mediaUrl,
      cta_text: input.ctaText ?? null,
      cta_link: input.ctaLink ?? null,
      position: input.position,
      start_at: input.startAt ?? null,
      end_at: input.endAt ?? null,
      status: input.status,
    });
    const row = await db('advertisements').where({ id }).first();
    return adDto(row!);
  },

  async update(id: number, input: UpdateAdInput): Promise<AdminAdDto> {
    const existing = await db('advertisements').where({ id }).first();
    if (!existing) throw ApiError.notFound('Advertisement not found');

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch['title'] = input.title ?? null;
    if (input.description !== undefined) patch['description'] = input.description ?? null;
    if (input.mediaUrl !== undefined) patch['media_url'] = input.mediaUrl;
    if (input.ctaText !== undefined) patch['cta_text'] = input.ctaText ?? null;
    if (input.ctaLink !== undefined) patch['cta_link'] = input.ctaLink ?? null;
    if (input.position !== undefined) patch['position'] = input.position;
    if (input.startAt !== undefined) patch['start_at'] = input.startAt ?? null;
    if (input.endAt !== undefined) patch['end_at'] = input.endAt ?? null;
    if (input.status !== undefined) patch['status'] = input.status;

    if (Object.keys(patch).length) await db('advertisements').where({ id }).update(patch);
    const row = await db('advertisements').where({ id }).first();
    return adDto(row!);
  },

  async remove(id: number): Promise<void> {
    const existing = await db('advertisements').where({ id }).first();
    if (!existing) throw ApiError.notFound('Advertisement not found');
    await db('advertisements').where({ id }).del();
  },
};

export const adminSocialLinkService = {
  async list(): Promise<AdminSocialLinkDto[]> {
    const rows = await db('social_links').orderBy('sort_order', 'asc').orderBy('id', 'asc');
    return rows.map(socialLinkDto);
  },

  async create(input: CreateSocialLinkInput): Promise<AdminSocialLinkDto> {
    const sortOrder = input.sortOrder || (await nextSortOrder('social_links'));
    const [id] = await db('social_links').insert({
      platform: input.platform,
      url: input.url,
      sort_order: sortOrder,
      status: input.status,
    });
    const row = await db('social_links').where({ id }).first();
    return socialLinkDto(row!);
  },

  async update(id: number, input: UpdateSocialLinkInput): Promise<AdminSocialLinkDto> {
    const existing = await db('social_links').where({ id }).first();
    if (!existing) throw ApiError.notFound('Social link not found');

    const patch: Record<string, unknown> = {};
    if (input.platform !== undefined) patch['platform'] = input.platform;
    if (input.url !== undefined) patch['url'] = input.url;
    if (input.sortOrder !== undefined) patch['sort_order'] = input.sortOrder;
    if (input.status !== undefined) patch['status'] = input.status;

    if (Object.keys(patch).length) await db('social_links').where({ id }).update(patch);
    const row = await db('social_links').where({ id }).first();
    return socialLinkDto(row!);
  },

  async move(id: number, direction: 'up' | 'down'): Promise<AdminSocialLinkDto[]> {
    const rows = await db('social_links').orderBy('sort_order', 'asc').orderBy('id', 'asc');
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw ApiError.notFound('Social link not found');
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < rows.length) {
      const a = rows[idx]!;
      const b = rows[swapIdx]!;
      await db.transaction(async (trx) => {
        await trx('social_links').where({ id: a.id }).update({ sort_order: b.sort_order });
        await trx('social_links').where({ id: b.id }).update({ sort_order: a.sort_order });
      });
    }
    const fresh = await db('social_links').orderBy('sort_order', 'asc').orderBy('id', 'asc');
    return fresh.map(socialLinkDto);
  },

  async remove(id: number): Promise<void> {
    const existing = await db('social_links').where({ id }).first();
    if (!existing) throw ApiError.notFound('Social link not found');
    await db('social_links').where({ id }).del();
  },
};
