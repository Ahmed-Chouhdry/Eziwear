import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categories', (t) => {
    t.increments('id').primary();
    t.string('name', 120).notNullable();
    t.string('slug', 140).notNullable().unique();
    t.string('description', 500).nullable();
    t.string('image', 500).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    t.timestamps(true, true);

    t.index(['status']);
  });

  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary();
    t.integer('category_id').unsigned().notNullable().references('id').inTable('categories').onDelete('RESTRICT');
    t.string('name', 180).notNullable();
    t.string('slug', 200).notNullable().unique();
    t.text('description').nullable();
    t.string('sku', 60).notNullable().unique();
    t.decimal('price', 10, 2).notNullable();
    t.decimal('sale_price', 10, 2).nullable();
    t.enu('status', ['draft', 'published', 'archived']).notNullable().defaultTo('draft');
    t.boolean('is_new_arrival').notNullable().defaultTo(false);
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.boolean('is_vip').notNullable().defaultTo(false);
    t.timestamps(true, true);

    t.index(['category_id']);
    t.index(['status']);
    t.index(['is_new_arrival']);
    t.index(['is_featured']);
    t.index(['is_vip']);
  });

  await knex.schema.createTable('product_images', (t) => {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('image_url', 500).notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);

    t.index(['product_id']);
  });

  await knex.schema.createTable('product_variants', (t) => {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('size', 40).notNullable();
    t.string('color', 60).notNullable();
    t.string('color_hex', 9).nullable();
    t.integer('stock').notNullable().defaultTo(0);
    t.string('sku', 80).notNullable().unique();
    t.timestamps(true, true);

    t.unique(['product_id', 'size', 'color']);
    t.index(['product_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.dropTableIfExists('product_images');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('categories');
}
