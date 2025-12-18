// src/app/api/geo-levels/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    const rows = db
      .prepare(
        `
        SELECT DISTINCT rndrng_prvdr_geo_lvl AS level
        FROM medicare_ip_geo_service_2023
        WHERE rndrng_prvdr_geo_lvl IS NOT NULL
        ORDER BY level ASC
        `
      )
      .all() as Array<{ level: string }>;

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
