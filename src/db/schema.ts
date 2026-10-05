import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const pollStatusEnum = pgEnum("poll_status", ["active", "closed"]);

/**
 * A poll's `windowDates` × `windowStartMinute`/`windowEndMinute` (host-local
 * minutes-since-midnight) × `slotMinutes` define the canonical grid of UTC
 * instants every viewer sees. Availability (host's own included, via the
 * `participants.isHost` row) is a subset of that grid, stored as atomic
 * facts in `availabilitySlots` — never as free-form ranges.
 */
export const polls = pgTable(
  "polls",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    meetingUrl: text("meeting_url"),
    hostTimezone: text("host_timezone").notNull(),
    windowDates: date("window_dates").array().notNull(),
    windowStartMinute: smallint("window_start_minute").notNull(),
    windowEndMinute: smallint("window_end_minute").notNull(),
    slotMinutes: smallint("slot_minutes").notNull().default(30),
    viewPasswordHash: text("view_password_hash"),
    hostPasswordHash: text("host_password_hash"),
    status: pollStatusEnum("status").notNull().default("active"),
    finalStartAt: timestamp("final_start_at", { withTimezone: true }),
    finalEndAt: timestamp("final_end_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "window_end_after_start",
      sql`${t.windowEndMinute} > ${t.windowStartMinute}`,
    ),
    check(
      "final_slot_both_or_neither",
      sql`(${t.finalStartAt} is null) = (${t.finalEndAt} is null)`,
    ),
    check("slot_minutes_valid", sql`${t.slotMinutes} in (15, 30, 60)`),
    index("polls_deleted_at_idx").on(t.deletedAt),
  ],
);

/**
 * The poll's host is a row here (`isHost = true`), not a separate concept —
 * this keeps overlap computation, availability editing, and bearer-token
 * authorization to one shared mechanism for host and participants alike.
 */
export const participants = pgTable(
  "participants",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    isHost: boolean("is_host").notNull().default(false),
    displayName: text("display_name").notNull(),
    accessTokenHash: text("access_token_hash").notNull(),
    timezone: text("timezone"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("one_host_per_poll")
      .on(t.pollId)
      .where(sql`${t.isHost} = true`),
    index("participants_poll_id_idx").on(t.pollId),
    uniqueIndex("participants_access_token_hash_idx").on(t.accessTokenHash),
  ],
);

/**
 * One row = "this participant is free for the slot beginning here"; the
 * slot's duration is implied by the owning poll's `slotMinutes`. Writes
 * always replace a participant's full set (delete + bulk insert) rather
 * than diffing, so concurrent submissions from different participants never
 * contend with each other.
 */
export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    slotStartAt: timestamp("slot_start_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("availability_participant_slot_unique").on(
      t.participantId,
      t.slotStartAt,
    ),
    index("availability_poll_slot_idx").on(t.pollId, t.slotStartAt),
  ],
);

export const pollsRelations = relations(polls, ({ many }) => ({
  participants: many(participants),
}));

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    poll: one(polls, {
      fields: [participants.pollId],
      references: [polls.id],
    }),
    availabilitySlots: many(availabilitySlots),
  }),
);

export const availabilitySlotsRelations = relations(
  availabilitySlots,
  ({ one }) => ({
    participant: one(participants, {
      fields: [availabilitySlots.participantId],
      references: [participants.id],
    }),
    poll: one(polls, {
      fields: [availabilitySlots.pollId],
      references: [polls.id],
    }),
  }),
);

export type Poll = typeof polls.$inferSelect;
export type NewPoll = typeof polls.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type NewAvailabilitySlot = typeof availabilitySlots.$inferInsert;
