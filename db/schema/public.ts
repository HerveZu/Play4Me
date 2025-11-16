import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from '@/db/schema/auth'
import * as betterAuthSchema from './auth'

export default betterAuthSchema

export const playlistQueues = pgTable('playlist_queues', {
  id: uuid('id').primaryKey().defaultRandom(),
  queuePlaylistId: text('playlist_id').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
})

export const playSessions = pgTable('play_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  playlistId: uuid('playlist_id')
    .notNull()
    .references(() => playlists.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),
  queueId: uuid('queue_id')
    .notNull()
    .references(() => playlistQueues.id),
  startedAt: timestamp('started_at').notNull(),
  stoppedAt: timestamp('stopped_at'),
})

export const playlists = pgTable('playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
})

export type PlaySession = typeof playSessions.$inferSelect
export type PlaylistQueue = typeof playlistQueues.$inferSelect
