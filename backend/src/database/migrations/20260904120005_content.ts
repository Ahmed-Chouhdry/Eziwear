import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sliders', (t) => {
    t.increments('id').primary();
    t.string('title', 180).nullable();
    t.string('subtitle', 255).nullable();
    t.string('image_url', 500).notNullable();
    t.string('image_url_mobile', 500).nullable();
    t.string('button_text', 60).nullable();
    t.string('button_link', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    t.timestamps(true, true);

    t.index(['status']);
  });

  await knex.schema.createTable('advertisements', (t) => {
    t.increments('id').primary();
    t.string('title', 180).nullable();
    t.string('description', 500).nullable();
    t.string('media_url', 500).notNullable();
    t.string('cta_text', 60).nullable();
    t.string('cta_link', 255).nullable();
    t.enu('position', ['hero', 'homepage_banner', 'popup', 'category']).notNullable().defaultTo('homepage_banner');
    t.timestamp('start_at').nullable();
    t.timestamp('end_at').nullable();
    t.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    t.timestamps(true, true);

    t.index(['position']);
    t.index(['status']);
  });

  await knex.schema.createTable('social_links', (t) => {
    t.increments('id').primary();
    t.string('platform', 40).notNullable();
    t.string('url', 255).notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('social_links');
  await knex.schema.dropTableIfExists('advertisements');
  await knex.schema.dropTableIfExists('sliders');
}
