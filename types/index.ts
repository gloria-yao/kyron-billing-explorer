export interface MedicareRecord {
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
}

export interface GeoLevel {
  level: string;
}

export interface Geography {
  description: string;
}

export interface DRG {
  code: number;
  description: string;
}