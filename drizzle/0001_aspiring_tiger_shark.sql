CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`courseId` int NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`occupation` varchar(150),
	`experience` text,
	`message` text,
	`status` enum('pending','reviewing','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`title` varchar(255) NOT NULL,
	`shortDescription` text NOT NULL,
	`description` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`duration` varchar(100) NOT NULL,
	`mode` varchar(100) NOT NULL,
	`tuition` int NOT NULL DEFAULT 0,
	`imageUrl` varchar(500),
	`nextStartAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`status` enum('enrolled','completed','paused') NOT NULL DEFAULT 'enrolled',
	`progress` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp,
	`location` varchar(255),
	`type` varchar(80) NOT NULL DEFAULT 'กิจกรรม',
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
