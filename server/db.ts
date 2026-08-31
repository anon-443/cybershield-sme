import { and, desc, eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertScan, InsertUser, scans, users } from "../drizzle/schema";
import type { ScanComparison, ScanReport, ScanSummary } from "../shared/cybershield";
import { ENV } from './_core/env';
import { buildScanComparison } from "./scanComparison";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function saveScan(scan: InsertScan) {
  const db = await getDb();
  if (!db) throw new Error("The scan database is currently unavailable. Please try again shortly.");
  await db.insert(scans).values(scan);
}

export async function listScansForUser(userId: number): Promise<ScanSummary[]> {
  const db = await getDb();
  if (!db) throw new Error("The scan database is currently unavailable. Please try again shortly.");
  return db
    .select({
      id: scans.id,
      domain: scans.domain,
      normalizedDomain: scans.normalizedDomain,
      overallScore: scans.overallScore,
      grade: scans.grade,
      websiteScore: scans.websiteScore,
      emailScore: scans.emailScore,
      domainScore: scans.domainScore,
      createdAt: scans.createdAt,
      completedAt: scans.completedAt,
    })
    .from(scans)
    .where(eq(scans.userId, userId))
    .orderBy(desc(scans.createdAt));
}

export async function getScanForUser(scanId: string, userId: number): Promise<ScanReport | null> {
  const db = await getDb();
  if (!db) throw new Error("The scan database is currently unavailable. Please try again shortly.");
  const result = await db.select({ reportJson: scans.reportJson }).from(scans).where(and(eq(scans.id, scanId), eq(scans.userId, userId))).limit(1);
  return (result[0]?.reportJson as ScanReport | undefined) ?? null;
}

function scanSummaryFields() {
  return {
    id: scans.id,
    domain: scans.domain,
    normalizedDomain: scans.normalizedDomain,
    overallScore: scans.overallScore,
    grade: scans.grade,
    websiteScore: scans.websiteScore,
    emailScore: scans.emailScore,
    domainScore: scans.domainScore,
    createdAt: scans.createdAt,
    completedAt: scans.completedAt,
  };
}

export async function getScanComparisonForUser(scanId: string, userId: number): Promise<ScanComparison | null> {
  const db = await getDb();
  if (!db) throw new Error("The scan database is currently unavailable. Please try again shortly.");
  const [current] = await db.select(scanSummaryFields()).from(scans).where(and(eq(scans.id, scanId), eq(scans.userId, userId))).limit(1);
  if (!current) return null;
  const [previous] = await db
    .select(scanSummaryFields())
    .from(scans)
    .where(and(eq(scans.userId, userId), eq(scans.normalizedDomain, current.normalizedDomain), lt(scans.createdAt, current.createdAt)))
    .orderBy(desc(scans.createdAt))
    .limit(1);
  return buildScanComparison(current, previous ?? null);
}
