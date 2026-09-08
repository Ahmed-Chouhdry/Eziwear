import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reviews', (t) => {
    // Customer-uploaded photos attached to a review (array of Cloudinary URLs).
    t.json('images').nullable().after('comment');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reviews', (t) => {
    t.dropColumn('images');
  });
}
