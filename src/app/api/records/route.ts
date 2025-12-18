import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function parseNumberParam(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const level = (searchParams.get('level') ?? '').trim();
    const geo = (searchParams.get('geo') ?? '').trim();
    const drgCdRaw = (searchParams.get('drg_cd') ?? '').trim();

    if (!level || !geo) return jsonError('Missing query params: level, geo', 400);

    const db = getDb();

    const LIMIT = 500;

    // Build WHERE clause + parameters
    let drgClause = '';
    const params: Array<string | number> = [level, geo];

    if (drgCdRaw) {
      const drgCd = parseNumberParam(drgCdRaw);
      if (drgCd === null) return jsonError('drg_cd must be a number', 400);

      drgClause = 'AND drg_cd = ?';
      params.push(drgCd);
    }

    const stmt = db.prepare(
      `
      SELECT
        id,
        rndrng_prvdr_geo_lvl,
        rndrng_prvdr_geo_cd,
        rndrng_prvdr_geo_desc,
        drg_cd,
        drg_desc,
        tot_dschrgs,
        avg_submtd_cvrd_chrg,
        avg_tot_pymt_amt,
        avg_mdcr_pymt_amt
      FROM medicare_ip_geo_service_2023
      WHERE rndrng_prvdr_geo_lvl = ?
        AND rndrng_prvdr_geo_desc = ?
        ${drgClause}
      ORDER BY avg_submtd_cvrd_chrg DESC
      LIMIT ?
      `
    );

    const rows = stmt.all(...params, LIMIT);
    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonError(message);
  }
}
