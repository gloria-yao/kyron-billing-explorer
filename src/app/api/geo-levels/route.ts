import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GeoLevelRow = { level: string };

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

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
      .all() as GeoLevelRow[];

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonError(message);
  }
}
