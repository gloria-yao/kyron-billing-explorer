'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type GeoLevel = { level: string };
type Geography = { description: string };
type DRG = { code: number; description: string };

type MedicareRecord = {
  id: number;
  rndrng_prvdr_geo_lvl: string;
  rndrng_prvdr_geo_cd: string | null;
  rndrng_prvdr_geo_desc: string;
  drg_cd: number;
  drg_desc: string;
  tot_dschrgs: number;
  avg_submtd_cvrd_chrg: number;
  avg_tot_pymt_amt: number;
  avg_mdcr_pymt_amt: number;
};

function money(n: number) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function money2(n: number) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function number(n: number) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString();
}

function pct(n: number) {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)}%`;
}

export default function Page() {
  // Defaults so the page is never “blank”
  const [selectedLevel, setSelectedLevel] = useState<string>('National');
  const [selectedGeo, setSelectedGeo] = useState<string>('National');
  const [selectedDrg, setSelectedDrg] = useState<string>('');

  const [geoSearch, setGeoSearch] = useState<string>('');
  const [drgSearch, setDrgSearch] = useState<string>('');

  const [geoLevels, setGeoLevels] = useState<GeoLevel[]>([]);
  const [geographies, setGeographies] = useState<Geography[]>([]);
  const [drgs, setDrgs] = useState<DRG[]>([]);
  const [records, setRecords] = useState<MedicareRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // --- Fetch geo levels (once) ---
  useEffect(() => {
    let cancelled = false;

    fetch('/api/geo-levels')
      .then(async (res) => {
        if (!res.ok) throw new Error(`geo-levels failed (${res.status})`);
        return res.json();
      })
      .then((data: GeoLevel[]) => {
        if (cancelled) return;
        setGeoLevels(data);

        // If defaults aren’t valid in someone else’s dataset, fall back gracefully.
        const levels = new Set(data.map((d) => d.level));
        if (!levels.has('National')) {
          const first = data?.[0]?.level ?? '';
          if (first) setSelectedLevel(first);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMsg(`Failed to load geography levels. ${e?.message ?? ''}`.trim());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // --- Fetch geographies when level/search changes ---
  useEffect(() => {
    let cancelled = false;

    if (!selectedLevel) {
      setGeographies([]);
      return;
    }

    const params = new URLSearchParams({ level: selectedLevel });
    if (geoSearch.trim()) params.set('search', geoSearch.trim());

    fetch(`/api/geos?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`geos failed (${res.status})`);
        return res.json();
      })
      .then((data: Geography[]) => {
        if (cancelled) return;
        setGeographies(data);

        // Keep selection valid after level changes
        if (data.length > 0) {
          const exists = data.some((g) => g.description === selectedGeo);
          if (!exists) setSelectedGeo(data[0].description);
        } else {
          setSelectedGeo('');
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMsg(`Failed to load geographies. ${e?.message ?? ''}`.trim());
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLevel, geoSearch]); // intentionally not depending on selectedGeo

  // --- Fetch DRGs when search changes ---
  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    if (drgSearch.trim()) params.set('search', drgSearch.trim());

    fetch(`/api/drgs?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`drgs failed (${res.status})`);
        return res.json();
      })
      .then((data: DRG[]) => {
        if (cancelled) return;
        setDrgs(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMsg(`Failed to load DRGs. ${e?.message ?? ''}`.trim());
      });

    return () => {
      cancelled = true;
    };
  }, [drgSearch]);

  // --- Fetch records when filters change ---
  useEffect(() => {
    let cancelled = false;

    if (!selectedLevel || !selectedGeo) {
      setRecords([]);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const params = new URLSearchParams({
      level: selectedLevel,
      geo: selectedGeo,
    });
    if (selectedDrg) params.set('drg_cd', selectedDrg);

    fetch(`/api/records?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`records failed (${res.status})`);
        return res.json();
      })
      .then((data: MedicareRecord[]) => {
        if (cancelled) return;
        setRecords(data);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoading(false);
        setErrorMsg(`Failed to load records. ${e?.message ?? ''}`.trim());
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLevel, selectedGeo, selectedDrg]);

  const handleReset = () => {
    setSelectedLevel('National');
    setSelectedGeo('National');
    setSelectedDrg('');
    setGeoSearch('');
    setDrgSearch('');
    setErrorMsg('');
  };

  // --- Derived summaries / charts ---
  const topByCharges = useMemo(() => {
    return [...records]
      .sort((a, b) => b.avg_submtd_cvrd_chrg - a.avg_submtd_cvrd_chrg)
      .slice(0, 10)
      .map((r) => ({
        drg: String(r.drg_cd),
        submitted: Math.round(r.avg_submtd_cvrd_chrg),
      }));
  }, [records]);

  const chargesVsPayments = useMemo(() => {
    return [...records]
      .sort((a, b) => b.avg_submtd_cvrd_chrg - a.avg_submtd_cvrd_chrg)
      .slice(0, 10)
      .map((r) => ({
        drg: String(r.drg_cd),
        submitted: Math.round(r.avg_submtd_cvrd_chrg),
        total_payment: Math.round(r.avg_tot_pymt_amt),
        medicare_payment: Math.round(r.avg_mdcr_pymt_amt),
      }));
  }, [records]);

  const paymentGapPct = useMemo(() => {
    return [...records]
      .filter((r) => r.avg_submtd_cvrd_chrg > 0)
      .sort((a, b) => (b.avg_submtd_cvrd_chrg - b.avg_tot_pymt_amt) - (a.avg_submtd_cvrd_chrg - a.avg_tot_pymt_amt))
      .slice(0, 10)
      .map((r) => {
        const gap = 1 - r.avg_tot_pymt_amt / r.avg_submtd_cvrd_chrg;
        return {
          drg: String(r.drg_cd),
          gap_pct: Math.max(0, Math.min(1, gap)) * 100,
        };
      });
  }, [records]);

  const kpis = useMemo(() => {
    if (records.length === 0) {
      return {
        count: 0,
        avgSubmitted: NaN,
        avgTotalPay: NaN,
        avgMedicarePay: NaN,
        avgGapPct: NaN,
      };
    }
    const avg = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / arr.length;

    const submitted = records.map((r) => r.avg_submtd_cvrd_chrg).filter(Number.isFinite);
    const totalPay = records.map((r) => r.avg_tot_pymt_amt).filter(Number.isFinite);
    const medicarePay = records.map((r) => r.avg_mdcr_pymt_amt).filter(Number.isFinite);

    const gapPcts = records
      .filter((r) => r.avg_submtd_cvrd_chrg > 0 && Number.isFinite(r.avg_tot_pymt_amt))
      .map((r) => (1 - r.avg_tot_pymt_amt / r.avg_submtd_cvrd_chrg) * 100);

    return {
      count: records.length,
      avgSubmitted: avg(submitted),
      avgTotalPay: avg(totalPay),
      avgMedicarePay: avg(medicarePay),
      avgGapPct: gapPcts.length ? avg(gapPcts) : NaN,
    };
  }, [records]);

  const pageTitle = 'Explore variation in hospital billing and Medicare reimbursement nationwide.';
  const purpose =
    'Hospital charges for the same inpatient procedure can differ substantially by location, while actual payments are often far lower than amounts billed. This dashboard highlights those gaps, helping clarify how hospital pricing, Medicare reimbursement, and geographic variation interact across inpatient services.';
  const instructions =
    'Select a geography and optional diagnosis-related group (DRG) to compare average submitted charges with payment amounts. The charts summarize billed-versus-paid differences, and the table below shows the underlying Medicare records used for each view.';

  return (
    <div className="kb-page">
      <header className="kb-header">
        <div className="kb-header-inner">
          <div className="kb-brand">
            <div className="kb-logo">
              {/* Put your logo in /public/kyron_medical.png */}
              <Image src="/kyron_medical.png" alt="Kyron Medical" width={160} height={44} priority />
            </div>
          </div>
        </div>
      </header>

      <main className="kb-main">
        <section className="kb-hero">
          <h1 className="kb-h1">{pageTitle}</h1>

          <p className="kb-purpose">{purpose}</p>
          <p className="kb-instructions">{instructions}</p>
        </section>

        <section className="kb-card kb-filters">
          <div className="kb-card-header">
            <h2 className="kb-h2">Filters</h2>
            <button className="kb-btn-secondary" onClick={handleReset}>
              Reset to National
            </button>
          </div>

          <div className="kb-grid">
            <div className="kb-field">
              <label className="kb-label">Geography level</label>
              <select
                className="kb-select"
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value);
                  setGeoSearch('');
                  setSelectedDrg('');
                }}
              >
                {geoLevels.length === 0 && <option value="">{'Loading…'}</option>}
                {geoLevels.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.level}
                  </option>
                ))}
              </select>
            </div>

            <div className="kb-field">
              <label className="kb-label">Search geography</label>
              <input
                className="kb-input"
                value={geoSearch}
                onChange={(e) => setGeoSearch(e.target.value)}
                placeholder="Type to filter…"
                disabled={!selectedLevel}
              />
            </div>

            <div className="kb-field">
              <label className="kb-label">Geography</label>
              <select
                className="kb-select"
                value={selectedGeo}
                onChange={(e) => setSelectedGeo(e.target.value)}
                disabled={!selectedLevel}
              >
                {geographies.length === 0 && <option value="">{'No matches'}</option>}
                {geographies.map((g) => (
                  <option key={g.description} value={g.description}>
                    {g.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="kb-field">
              <label className="kb-label">Search DRG</label>
              <input
                className="kb-input"
                value={drgSearch}
                onChange={(e) => setDrgSearch(e.target.value)}
                placeholder="e.g., hip, sepsis, 470…"
              />
            </div>

            <div className="kb-field">
              <label className="kb-label">DRG (optional)</label>
              <select className="kb-select" value={selectedDrg} onChange={(e) => setSelectedDrg(e.target.value)}>
                <option value="">All DRGs</option>
                {drgs.map((d) => (
                  <option key={d.code} value={String(d.code)}>
                    {d.code} — {d.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMsg && <div className="kb-alert">{errorMsg}</div>}
        </section>

        <section className="kb-kpis">
          <div className="kb-kpi">
            <div className="kb-kpi-label">Rows returned</div>
            <div className="kb-kpi-value">{number(kpis.count)}</div>
          </div>
          <div className="kb-kpi">
            <div className="kb-kpi-label">Avg submitted charges</div>
            <div className="kb-kpi-value">{money(kpis.avgSubmitted)}</div>
          </div>
          <div className="kb-kpi">
            <div className="kb-kpi-label">Avg total payment</div>
            <div className="kb-kpi-value">{money(kpis.avgTotalPay)}</div>
          </div>
          <div className="kb-kpi">
            <div className="kb-kpi-label">Avg Medicare payment</div>
            <div className="kb-kpi-value">{money(kpis.avgMedicarePay)}</div>
          </div>
          <div className="kb-kpi">
            <div className="kb-kpi-label">Avg billed-to-paid gap</div>
            <div className="kb-kpi-value">{pct(kpis.avgGapPct)}</div>
          </div>
        </section>

        {loading && <div className="kb-loading">Loading data…</div>}

        {!loading && records.length === 0 && (
          <div className="kb-empty">
            No records found for the current selection. Try another geography or clear the DRG filter.
          </div>
        )}

        {!loading && records.length > 0 && (
          <>
            <section className="kb-charts">
              <div className="kb-card">
                <h3 className="kb-h3">Top DRGs by average submitted charges</h3>
                <p className="kb-caption">
                  Shows the DRGs with the highest billed amounts (submitted charges) within the selected geography.
                </p>
                <div className="kb-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topByCharges} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="drg" tickMargin={8} />
                      <YAxis tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                      <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                      <Bar dataKey="submitted" name="Avg submitted charges" fill="var(--kyron-blue)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="kb-card">
                <h3 className="kb-h3">Average submitted charges vs payments</h3>
                <p className="kb-caption">
                  Compares billed amounts to total payments and the Medicare-paid portion for the same DRGs.
                </p>
                <div className="kb-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chargesVsPayments} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="drg" tickMargin={8} />
                      <YAxis tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                      <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="submitted" name="Avg submitted charges" fill="var(--kyron-blue)" />
                      <Bar dataKey="total_payment" name="Avg total payment" fill="#82ca9d" />
                      <Bar dataKey="medicare_payment" name="Avg Medicare payment" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="kb-card">
                <h3 className="kb-h3">Largest billed-to-paid gaps</h3>
                <p className="kb-caption">
                  Highlights DRGs where the difference between submitted charges and total payment is largest (shown as a percentage).
                </p>
                <div className="kb-chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={paymentGapPct} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="drg" tickMargin={8} />
                      <YAxis tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
                      <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                      <Bar dataKey="gap_pct" name="Gap (%)" fill="#7aa7ff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="kb-card">
              <div className="kb-card-header">
                <h3 className="kb-h3">Underlying records</h3>
                <div className="kb-muted">
                  {selectedLevel} · {selectedGeo}
                  {selectedDrg ? ` · DRG ${selectedDrg}` : ''}
                </div>
              </div>

              <div className="kb-table-wrap">
                <table className="kb-table">
                  <thead>
                    <tr>
                      <th>DRG</th>
                      <th>Description</th>
                      <th>Discharges</th>
                      <th>Avg submitted charges</th>
                      <th>Avg total payment</th>
                      <th>Avg Medicare payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td className="kb-mono">{r.drg_cd}</td>
                        <td>{r.drg_desc}</td>
                        <td>{number(r.tot_dschrgs)}</td>
                        <td>{money2(r.avg_submtd_cvrd_chrg)}</td>
                        <td>{money2(r.avg_tot_pymt_amt)}</td>
                        <td>{money2(r.avg_mdcr_pymt_amt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Styles co-located to keep your repo simple and “human-written” */}
      <style jsx global>{`
        :root {
          --kyron-blue: #5a7cf5;
          --ink: #0b1220;
          --muted: #5b667a;
          --card: rgba(255, 255, 255, 0.92);
          --border: rgba(15, 23, 42, 0.10);
          --shadow: 0 10px 30px rgba(2, 8, 23, 0.08);
          --grid: rgba(15, 23, 42, 0.06);
        }

        .kb-page {
          min-height: 100vh;
          color: var(--ink);
          background:
            linear-gradient(to right, var(--grid) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid) 1px, transparent 1px),
            #f7f9ff;
          background-size: 48px 48px;
        }

        .kb-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
        }

        .kb-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 20px;
        }

        .kb-logo {
          display: flex;
          align-items: center;
        }

        .kb-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 20px 60px;
        }

        .kb-hero {
          margin-top: 8px;
          margin-bottom: 22px;
        }

        .kb-h1 {
          font-size: 56px;
          line-height: 1.05;
          letter-spacing: -0.02em;
          font-weight: 800;
          margin: 0 0 14px;
        }

        .kb-purpose {
          margin: 0 0 10px;
          font-size: 18px;
          line-height: 1.6;
          color: var(--muted);
          max-width: 980px;
        }

        .kb-instructions {
          margin: 0;
          font-size: 16px;
          line-height: 1.55;
          color: var(--muted);
          max-width: 980px;
        }

        .kb-card {
          background: var(--card);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .kb-card-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .kb-h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .kb-h3 {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 700;
        }

        .kb-caption {
          margin: 0 0 10px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .kb-muted {
          color: var(--muted);
          font-size: 13px;
        }

        .kb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 10px;
        }

        .kb-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .kb-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
        }

        .kb-input,
        .kb-select {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          background: white;
          color: var(--ink);
          outline: none;
        }

        .kb-input:disabled,
        .kb-select:disabled {
          opacity: 0.6;
        }

        .kb-btn-secondary {
          border: 1px solid var(--border);
          background: white;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 700;
          font-size: 13px;
          color: var(--ink);
          cursor: pointer;
        }

        .kb-btn-secondary:hover {
          border-color: rgba(90, 124, 245, 0.35);
        }

        .kb-alert {
          margin-top: 12px;
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(239, 68, 68, 0.25);
          background: rgba(239, 68, 68, 0.06);
          color: #7f1d1d;
          font-size: 13px;
        }

        .kb-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .kb-kpi {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow);
          padding: 14px 16px;
        }

        .kb-kpi-label {
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .kb-kpi-value {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .kb-loading,
        .kb-empty {
          padding: 16px;
          color: var(--muted);
        }

        .kb-charts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .kb-chart {
          width: 100%;
          height: 320px;
        }

        .kb-table-wrap {
          overflow-x: auto;
        }

        .kb-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .kb-table thead th {
          text-align: left;
          padding: 10px 10px;
          color: var(--muted);
          font-weight: 800;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .kb-table tbody td {
          padding: 10px 10px;
          border-bottom: 1px solid var(--border);
          vertical-align: top;
        }

        .kb-mono {
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 680px) {
          .kb-h1 {
            font-size: 38px;
          }
        }
      `}</style>
    </div>
  );
}
