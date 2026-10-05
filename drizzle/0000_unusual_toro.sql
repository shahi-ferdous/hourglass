CREATE TYPE "public"."poll_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"slot_start_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"display_name" text NOT NULL,
	"access_token_hash" text NOT NULL,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"meeting_url" text,
	"host_timezone" text NOT NULL,
	"window_dates" date[] NOT NULL,
	"window_start_minute" smallint NOT NULL,
	"window_end_minute" smallint NOT NULL,
	"slot_minutes" smallint DEFAULT 30 NOT NULL,
	"view_password_hash" text,
	"host_password_hash" text,
	"status" "poll_status" DEFAULT 'active' NOT NULL,
	"final_start_at" timestamp with time zone,
	"final_end_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "window_end_after_start" CHECK ("polls"."window_end_minute" > "polls"."window_start_minute"),
	CONSTRAINT "final_slot_both_or_neither" CHECK (("polls"."final_start_at" is null) = ("polls"."final_end_at" is null)),
	CONSTRAINT "slot_minutes_valid" CHECK ("polls"."slot_minutes" in (15, 30, 60))
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_participant_slot_unique" ON "availability_slots" USING btree ("participant_id","slot_start_at");--> statement-breakpoint
CREATE INDEX "availability_poll_slot_idx" ON "availability_slots" USING btree ("poll_id","slot_start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_host_per_poll" ON "participants" USING btree ("poll_id") WHERE "participants"."is_host" = true;--> statement-breakpoint
CREATE INDEX "participants_poll_id_idx" ON "participants" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "polls_deleted_at_idx" ON "polls" USING btree ("deleted_at");