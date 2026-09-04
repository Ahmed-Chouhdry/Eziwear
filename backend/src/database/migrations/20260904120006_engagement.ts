import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reviews', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.tinyint('rating').notNullable();
    t.string('comment', 1000).nullable();
    t.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    t.timestamps(true, true);

    t.unique(['user_id', 'product_id']);
    t.index(['product_id', 'status']);
  });

  await knex.schema.createTable('notifications', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 60).notNullable();
    t.string('title', 180).notNullable();
    t.string('message', 500).notNullable();
    t.string('link', 255).nullable();
    t.timestamp('read_at').nullable();
    t.timestamps(true, true);

    t.index(['user_id']);
  });

  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.integer('admin_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 80).notNullable();
    t.string('entity', 80).notNullable();
    t.integer('entity_id').unsigned().nullable();
    t.json('details').nullable();
    t.string('ip', 45).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['entity', 'entity_id']);
    t.index(['admin_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('reviews');
}
