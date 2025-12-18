# Kyron Billing Explorer

A small Next.js dashboard for exploring **Medicare Inpatient Prospective Payment System (IPPS)** billing data by geography and DRG (Diagnosis Related Group). The app loads the dataset into a local SQLite database and exposes a few read-only API endpoints used by the UI.

## What this shows

For a selected:
- **Geography level** (e.g., National, State)
- **Geography** (e.g., National, Rhode Island)
- Optional **DRG** (e.g., hip/knee replacement)

…the dashboard queries up to 500 matching rows and displays:
- Average submitted covered charges
- Average total payment
- Average Medicare payment
- Total discharges

## Data

The app expects the IPPS dataset to be imported into a SQLite table named:

`medicare_ip_geo_service_2023`

Key columns used:
- `rndrng_prvdr_geo_lvl`
- `rndrng_prvdr_geo_desc`
- `drg_cd`, `drg_desc`
- `tot_dschrgs`
- `avg_submtd_cvrd_chrg`
- `avg_tot_pymt_amt`
- `avg_mdcr_pymt_amt`

## API

These endpoints back the UI:

- `GET /api/geo-levels`  
  Returns available geography levels.

- `GET /api/geos?level=...&search=...`  
  Returns matching geographies for a level (optional `search`).

- `GET /api/drgs?search=...`  
  Returns matching DRGs (optional `search`; returns a small default set if empty).

- `GET /api/records?level=...&geo=...&drg_cd=...`  
  Returns up to 500 matching records sorted by highest submitted charges.

## Local development

Install dependencies:

```bash
npm install
