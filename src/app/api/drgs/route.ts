import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DrgRow = { code: number; description: string };

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').trim();

    const db = getDb();

    const DEFAULT_LIMIT = 50;
    const SEARCH_LIMIT = 200;

    if (!search) {
      const rows = db
        .prepare(
          `
          SELECT DISTINCT
            drg_cd   AS code,
            drg_desc AS description
          FROM medicare_ip_geo_service_2023
          WHERE drg_cd IS NOT NULL
            AND drg_desc IS NOT NULL
          ORDER BY code ASC
          LIMIT ?
          `
        )
        .all(DEFAULT_LIMIT) as DrgRow[];

      return NextResponse.json(rows);
    }

    const isNumeric = /^\d+$/.test(search);

    const stmt = db.prepare(
      `
      SELECT DISTINCT
        drg_cd   AS code,
        drg_desc AS description
      FROM medicare_ip_geo_service_2023
      WHERE drg_cd IS NOT NULL
        AND drg_desc IS NOT NULL
        AND ${isNumeric ? 'drg_cd = ?' : 'drg_desc LIKE ?'}
      ORDER BY code ASC
      LIMIT ?
      `
    );

    const rows = (isNumeric
      ? stmt.all(Number(search), SEARCH_LIMIT)
      : stmt.all(`%${search}%`, SEARCH_LIMIT)) as DrgRow[];

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonError(message);
  }
}
