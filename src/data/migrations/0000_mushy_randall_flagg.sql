CREATE TABLE `call_up_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`player_name` text NOT NULL,
	`player_number` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `call_up_entries_match_id_player_id_unique` ON `call_up_entries` (`match_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `marks` (
	`call_up_entry_id` integer NOT NULL,
	`column_kind` text NOT NULL,
	`column_number` integer NOT NULL,
	`mark` text NOT NULL,
	PRIMARY KEY(`call_up_entry_id`, `column_kind`, `column_number`),
	FOREIGN KEY (`call_up_entry_id`) REFERENCES `call_up_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "marks_column_kind_check" CHECK("marks"."column_kind" in ('period', 'overtime')),
	CONSTRAINT "marks_mark_check" CHECK("marks"."mark" in ('starter', 'sub'))
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`format` integer NOT NULL,
	`date` text NOT NULL,
	`time` text,
	`home_name` text,
	`away_name` text,
	`notes` text,
	`home_score` integer,
	`away_score` integer,
	`overtime_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "matches_format_check" CHECK("matches"."format" in (4, 6, 8)),
	CONSTRAINT "matches_scores_check" CHECK(("matches"."home_score" is null) = ("matches"."away_score" is null))
);
--> statement-breakpoint
CREATE INDEX `matches_team_id_idx` ON `matches` (`team_id`);--> statement-breakpoint
CREATE INDEX `matches_date_time_idx` ON `matches` (`date`,`time`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`name` text NOT NULL,
	`number` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`default_format` integer NOT NULL,
	CONSTRAINT "teams_default_format_check" CHECK("teams"."default_format" in (4, 6, 8))
);
