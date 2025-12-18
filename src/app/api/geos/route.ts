// src/app/api/geos/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const level = (url.searchParams.get('level') ?? '').trim();
    const search = (url.searchParams.get('search') ?? '').trim();

    if (!level) {
      return NextResponse.json({ error: 'Missing required query param: level' }, { status: 400 });
    }

    const db = getDb();

    let rows: Array<{ description: string }> = [];

    if (search) {
      rows = db
        .prepare(
          `
          SELECT DISTINCT rndrng_prvdr_geo_desc AS description
          FROM medicare_ip_geo_service_2023
          WHERE rndrng_prvdr_geo_lvl = ?
            AND rndrng_prvdr_geo_desc IS NOT NULL
            AND rndrng_prvdr_geo_desc LIKE ?
          ORDER BY description ASC
          LIMIT 200
          `
        )
        .all(level, `%${search}%`) as Array<{ description: string }>;
    } else {
      rows = db
        .prepare(
          `
          SELECT DISTINCT rndrng_prvdr_geo_desc AS description
          FROM medicare_ip_geo_service_2023
          WHERE rndrng_prvdr_geo_lvl = ?
            AND rndrng_prvdr_geo_desc IS NOT NULL
          ORDER BY description ASC
          LIMIT 200
          `
        )
        .all(level) as Array<{ description: string }>;
    }

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
