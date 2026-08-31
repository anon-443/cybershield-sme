import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import type { ScanReport } from "../shared/cybershield";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const scans = mysqlTable(
  "scans",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    domain: varchar("domain", { length: 253 }).notNull(),
    normalizedDomain: varchar("normalizedDomain", { length: 253 }).notNull(),
    status: mysqlEnum("status", ["completed", "failed"]).notNull().default("completed"),
    overallScore: int("overallScore").notNull(),
    grade: varchar("grade", { length: 1 }).notNull(),
    websiteScore: int("websiteScore").notNull(),
    emailScore: int("emailScore").notNull(),
    domainScore: int("domainScore").notNull(),
    reportJson: json("reportJson").$type<ScanReport>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt").defaultNow(),
  },
  table => [index("scans_user_created_idx").on(table.userId, table.createdAt)],
);

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;
