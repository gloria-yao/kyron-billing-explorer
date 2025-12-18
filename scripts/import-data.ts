import { PrismaClient } from '@prisma/client';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Path to the ZIP file (same directory as this script or project root)
const ZIP_FILE_PATH = path.join(process.cwd(), 'Medicare_IP_Hospitals_by_Geography_and_Service_2023.zip');
const CSV_FILE_NAME = 'Medicare_IP_Hospitals_by_Geography_and_Service_2023.csv';

interface CSVRow {
  Rndrng_Prvdr_Geo_Lvl: string;
  Rndrng_Prvdr_Geo_Cd: string;
  Rndrng_Prvdr_Geo_Desc: string;
  DRG_Cd: string;
  DRG_Desc: string;
  Tot_Dschrgs: string;
  Avg_Submtd_Cvrd_Chrg: string;
  Avg_Tot_Pymt_Amt: string;
  Avg_Mdcr_Pymt_Amt: string;
}

async function importData() {
  console.log('🚀 Starting data import...\n');

  // 1. Check if ZIP file exists
  if (!fs.existsSync(ZIP_FILE_PATH)) {
    console.error(`❌ ZIP file not found at: ${ZIP_FILE_PATH}`);
    console.error('Please place the ZIP file in the project root directory.');
    process.exit(1);
  }

  console.log(`✓ Found ZIP file: ${ZIP_FILE_PATH}`);

  // 2. Extract CSV from ZIP
  console.log('📦 Extracting CSV from ZIP...');
  const zip = new AdmZip(ZIP_FILE_PATH);
  const csvEntry = zip.getEntry(CSV_FILE_NAME);

  if (!csvEntry) {
    console.error(`❌ CSV file "${CSV_FILE_NAME}" not found in ZIP`);
    process.exit(1);
  }

  const csvContent = zip.readAsText(csvEntry);
  console.log(`✓ Extracted CSV (${csvContent.length.toLocaleString()} characters)\n`);

  // 3. Parse CSV
  console.log('📊 Parsing CSV...');
  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`✓ Parsed ${records.length.toLocaleString()} records\n`);

  // 4. Clear existing data (idempotent approach)
  console.log('🗑️  Clearing existing data...');
  const deleteResult = await prisma.medicareIpGeoService2023.deleteMany({});
  console.log(`✓ Deleted ${deleteResult.count} existing records\n`);

  // 5. Transform and insert data
  console.log('💾 Inserting data into database...');
  
  const batchSize = 1000;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const transformedBatch = batch.map((row) => ({
      rndrng_prvdr_geo_lvl: row.Rndrng_Prvdr_Geo_Lvl,
      rndrng_prvdr_geo_cd: row.Rndrng_Prvdr_Geo_Cd === 'NaN' || !row.Rndrng_Prvdr_Geo_Cd ? null : row.Rndrng_Prvdr_Geo_Cd,
      rndrng_prvdr_geo_desc: row.Rndrng_Prvdr_Geo_Desc,
      drg_cd: parseInt(row.DRG_Cd, 10),
      drg_desc: row.DRG_Desc,
      tot_dschrgs: parseInt(row.Tot_Dschrgs, 10),
      avg_submtd_cvrd_chrg: parseFloat(row.Avg_Submtd_Cvrd_Chrg),
      avg_tot_pymt_amt: parseFloat(row.Avg_Tot_Pymt_Amt),
      avg_mdcr_pymt_amt: parseFloat(row.Avg_Mdcr_Pymt_Amt),
    }));

    await prisma.medicareIpGeoService2023.createMany({
      data: transformedBatch,
    });

    inserted += transformedBatch.length;
    process.stdout.write(`\r   Progress: ${inserted.toLocaleString()} / ${records.length.toLocaleString()} records`);
  }

  console.log('\n✓ Data import complete!\n');

  // 6. Verify import
  const totalCount = await prisma.medicareIpGeoService2023.count();
  const sampleRecord = await prisma.medicareIpGeoService2023.findFirst();

  console.log('📈 Database Statistics:');
  console.log(`   Total records: ${totalCount.toLocaleString()}`);
  console.log(`   Sample record ID: ${sampleRecord?.id}`);
  console.log(`   Sample DRG: ${sampleRecord?.drg_cd} - ${sampleRecord?.drg_desc}`);
  console.log(`   Sample Geography: ${sampleRecord?.rndrng_prvdr_geo_desc} (${sampleRecord?.rndrng_prvdr_geo_lvl})`);
  console.log('\n✅ Import successful!');
}

importData()
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });