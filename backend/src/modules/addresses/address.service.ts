import { db } from '../../config/db.js';
import type { AddressRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import type { AddressBody } from './address.schemas.js';

export interface AddressDto {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  area: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

function toDto(row: AddressRow): AddressDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    area: row.area,
    postalCode: row.postal_code,
    isDefault: !!row.is_default,
  };
}

export const addressService = {
  async list(userId: number): Promise<AddressDto[]> {
    const rows = await db('addresses')
      .where({ user_id: userId })
      .orderBy('is_default', 'desc')
      .orderBy('id', 'desc');
    return rows.map(toDto);
  },

  async get(userId: number, id: number): Promise<AddressRow> {
    const row = await db('addresses').where({ id, user_id: userId }).first();
    if (!row) throw ApiError.notFound('Address not found');
    return row;
  },

  async create(userId: number, body: AddressBody): Promise<AddressDto> {
    const count = await db('addresses').where({ user_id: userId }).count<{ n: number }[]>({ n: '*' });
    const isFirst = Number(count[0]?.n ?? 0) === 0;
    const makeDefault = body.isDefault || isFirst;

    return db.transaction(async (trx) => {
      if (makeDefault) {
        await trx('addresses').where({ user_id: userId }).update({ is_default: false });
      }
      const [id] = await trx('addresses').insert({
        user_id: userId,
        name: body.name,
        phone: body.phone,
        address: body.address,
        city: body.city,
        area: body.area ?? null,
        postal_code: body.postalCode ?? null,
        is_default: makeDefault,
      });
      const row = await trx('addresses').where({ id }).first();
      return toDto(row!);
    });
  },

  async update(userId: number, id: number, body: AddressBody): Promise<AddressDto> {
    await this.get(userId, id);
    return db.transaction(async (trx) => {
      if (body.isDefault) {
        await trx('addresses').where({ user_id: userId }).update({ is_default: false });
      }
      await trx('addresses')
        .where({ id, user_id: userId })
        .update({
          name: body.name,
          phone: body.phone,
          address: body.address,
          city: body.city,
          area: body.area ?? null,
          postal_code: body.postalCode ?? null,
          ...(body.isDefault !== undefined ? { is_default: !!body.isDefault } : {}),
        });
      const row = await trx('addresses').where({ id }).first();
      return toDto(row!);
    });
  },

  async remove(userId: number, id: number): Promise<void> {
    const addr = await this.get(userId, id);
    await db('addresses').where({ id, user_id: userId }).del();
    if (addr.is_default) {
      const next = await db('addresses').where({ user_id: userId }).orderBy('id', 'desc').first();
      if (next) await db('addresses').where({ id: next.id }).update({ is_default: true });
    }
  },
};
