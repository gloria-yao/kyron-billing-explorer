import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GeoRow = { description: string };

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const level = (searchParams.get('level') ?? '').trim();
    const search = (searchParams.get('search') ?? '').trim();

    if (!level) return jsonError('Missing query param: level', 400);

    const db = getDb();

    const LIMIT = 200;

    if (!search) {
      const rows = db
        .prepare(
          `
          SELECT DISTINCT rndrng_prvdr_geo_desc AS description
          FROM medicare_ip_geo_service_2023
          WHERE rndrng_prvdr_geo_lvl = ?
            AND rndrng_prvdr_geo_desc IS NOT NULL
          ORDER BY description ASC
          LIMIT ?
          `
        )
        .all(level, LIMIT) as GeoRow[];

      return NextResponse.json(rows);
    }

    const rows = db
      .prepare(
        `
        SELECT DISTINCT rndrng_prvdr_geo_desc AS description
        FROM medicare_ip_geo_service_2023
        WHERE rndrng_prvdr_geo_lvl = ?
          AND rndrng_prvdr_geo_desc IS NOT NULL
          AND rndrng_prvdr_geo_desc LIKE ?
        ORDER BY description ASC
        LIMIT ?
        `
      )
      .all(level, `%${search}%`, LIMIT) as GeoRow[];

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonError(message);
  }
}
