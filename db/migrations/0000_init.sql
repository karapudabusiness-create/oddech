CREATE TABLE `catch_events` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`created_at` text NOT NULL,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `catch_events_date_idx` ON `catch_events` (`date`);--> statement-breakpoint
CREATE TABLE `day_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`catches` integer DEFAULT 0 NOT NULL,
	`tension` integer,
	`note` text DEFAULT '' NOT NULL,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_logs_date_uq` ON `day_logs` (`date`);--> statement-breakpoint
CREATE TABLE `exercise_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`date` text NOT NULL,
	`completed_at` text NOT NULL,
	`duration_s` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`feeling` integer,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `completions_date_idx` ON `exercise_completions` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `completions_active_uq` ON `exercise_completions` (`exercise_id`,`date`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`seed_key` text,
	`name` text NOT NULL,
	`slot` text NOT NULL,
	`minutes` integer DEFAULT 1 NOT NULL,
	`inhale_s` integer DEFAULT 0 NOT NULL,
	`exhale_s` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercises_sort_idx` ON `exercises` (`slot`,`sort_order`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text,
	`program_start_date` text NOT NULL,
	`catch_goal` integer DEFAULT 5 NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`sound` text NOT NULL,
	`haptics` integer DEFAULT true NOT NULL,
	`reminders` text NOT NULL,
	`onboarding_done` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	`dirty` integer DEFAULT true NOT NULL
);
