CREATE TABLE `scans` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`domain` varchar(253) NOT NULL,
	`normalizedDomain` varchar(253) NOT NULL,
	`status` enum('completed','failed') NOT NULL DEFAULT 'completed',
	`overallScore` int NOT NULL,
	`grade` varchar(1) NOT NULL,
	`websiteScore` int NOT NULL,
	`emailScore` int NOT NULL,
	`domainScore` int NOT NULL,
	`reportJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp DEFAULT (now()),
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `scans_user_created_idx` ON `scans` (`userId`,`createdAt`);