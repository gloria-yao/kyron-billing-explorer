// src/app/api/drgs/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = (url.searchParams.get('search') ?? '').trim();

    const db = getDb();

    // Return DRG list for dropdown/autocomplete
    // If search is empty, return a small default set (otherwise it can be huge)
    let rows: Array<{ code: number; description: string }> = [];

    if (search) {
      const isNumberSearch = /^\d+$/.test(search);

      rows = db
        .prepare(
          `
          SELECT DISTINCT drg_cd AS code, drg_desc AS description
          FROM medicare_ip_geo_service_2023
          WHERE drg_cd IS NOT NULL
            AND drg_desc IS NOT NULL
            AND (
              ${isNumberSearch ? 'drg_cd = ?' : 'drg_desc LIKE ?'}
            )
          ORDER BY code ASC
          LIMIT 200
          `
        )
        .all(isNumberSearch ? Number(search) : `%${search}%`) as Array<{ code: number; description: string }>;
    } else {
      // Small default set so the dropdown doesn't hang the UI
      rows = db
        .prepare(
          `
          SELECT DISTINCT drg_cd AS code, drg_desc AS description
          FROM medicare_ip_geo_service_2023
          WHERE drg_cd IS NOT NULL AND drg_desc IS NOT NULL
          ORDER BY code ASC
          LIMIT 50
          `
        )
        .all() as Array<{ code: number; description: string }>;
    }

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
