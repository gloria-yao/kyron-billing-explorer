-- CreateTable
CREATE TABLE "medicare_ip_geo_service_2023" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rndrng_prvdr_geo_lvl" TEXT NOT NULL,
    "rndrng_prvdr_geo_cd" TEXT,
    "rndrng_prvdr_geo_desc" TEXT NOT NULL,
    "drg_cd" INTEGER NOT NULL,
    "drg_desc" TEXT NOT NULL,
    "tot_dschrgs" INTEGER NOT NULL,
    "avg_submtd_cvrd_chrg" REAL NOT NULL,
    "avg_tot_pymt_amt" REAL NOT NULL,
    "avg_mdcr_pymt_amt" REAL NOT NULL
);

-- CreateIndex
CREATE INDEX "medicare_ip_geo_service_2023_rndrng_prvdr_geo_lvl_idx" ON "medicare_ip_geo_service_2023"("rndrng_prvdr_geo_lvl");

-- CreateIndex
CREATE INDEX "medicare_ip_geo_service_2023_rndrng_prvdr_geo_desc_idx" ON "medicare_ip_geo_service_2023"("rndrng_prvdr_geo_desc");

-- CreateIndex
CREATE INDEX "medicare_ip_geo_service_2023_drg_cd_idx" ON "medicare_ip_geo_service_2023"("drg_cd");
