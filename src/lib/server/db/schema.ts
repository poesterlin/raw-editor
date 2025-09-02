import { relations } from 'drizzle-orm';
import { integer, pgTable, real, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const sessionTable = pgTable('session', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull(),
	endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' })
});

export type Session = typeof sessionTable.$inferSelect;

export const sessionRelations = relations(sessionTable, ({ many }) => ({
	images: many(imageTable)
}));

export const imageTable = pgTable('image', {
	id: serial('id').primaryKey(),
	filepath: text('filename').notNull(),
	previewPath: text('preview_path'),
	tifPath: text('tiff_path'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	sessionId: integer('session_id')
		.notNull()
		.references(() => sessionTable.id, { onDelete: 'cascade' }),
	version: integer('version').notNull().default(1),
	recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	name: text('name').notNull(),
	resolutionX: integer('resolution_x').notNull(),
	resolutionY: integer('resolution_y').notNull(),
	rating: integer('rating').notNull().default(0),
	iso: integer('iso'),
	aperture: real('aperture'),
	exposure: text('exposure'),
	focalLength: text('focal_length'),
	camera: text('camera'),
	lens: text('lens'),
	whiteBalance: real('white_balance'),
	tint: real('tint'),
});

export type Image = typeof imageTable.$inferSelect;

export const imageRelations = relations(imageTable, ({ one, many }) => ({
	session: one(sessionTable, {
		fields: [imageTable.sessionId],
		references: [sessionTable.id]
	}),
	edits: many(editTable)
}));

export const editTable = pgTable('edit', {
	id: serial('id').primaryKey(),
	pp3: text('pp3').notNull(), // This stores the RawTherapee profile string
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	imageId: integer('image_id')
		.notNull()
		.references(() => imageTable.id, { onDelete: 'cascade' })
});

export type Edit = typeof editTable.$inferSelect;

export const editRelations = relations(editTable, ({ one }) => ({
	image: one(imageTable, {
		fields: [editTable.imageId],
		references: [imageTable.id]
	})
}));

export const importTable = pgTable('import', {
	id: serial('id').primaryKey(),
	filePath: text('file_path').notNull(),
	previewPath: text('preview_path'),
	date: timestamp('date', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	importedAt: timestamp('imported_at', { withTimezone: true, mode: 'date' })
});

export type Import = typeof importTable.$inferSelect;