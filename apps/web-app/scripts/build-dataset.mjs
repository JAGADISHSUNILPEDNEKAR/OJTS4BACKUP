#!/usr/bin/env node
/**
 * Build-time script: Converts clean_dataset.csv → pre-paginated static JSON files.
 * Output goes to public/data/ so Vercel serves them from CDN (zero serverless cost).
 *
 * Structure:
 *   public/data/stats.json
 *   public/data/shipments/meta.json         { total, pages, statusCounts }
 *   public/data/shipments/all/1.json        page 1 (PAGE_SIZE rows)
 *   public/data/shipments/IN_TRANSIT/1.json  filtered pages
 *   public/data/alerts/meta.json
 *   public/data/alerts/all/1.json
 *   ...
 */

import { createReadStream, mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { parse } from 'csv-parse';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_APP_ROOT = resolve(__dirname, '..');
const PUBLIC_DATA_DIR = resolve(WEB_APP_ROOT, 'public', 'data');
const PAGE_SIZE = 100; // rows per static page file

// Try multiple CSV locations
const CSV_CANDIDATES = [
    resolve(WEB_APP_ROOT, '..', '..', 'Dataset', 'clean_dataset.csv'),
    resolve(WEB_APP_ROOT, 'Dataset', 'clean_dataset.csv'),
    resolve(process.cwd(), 'Dataset', 'clean_dataset.csv'),
];

function findCSV() {
    for (const p of CSV_CANDIDATES) {
        if (existsSync(p)) return p;
    }
    throw new Error(`CSV not found. Tried: ${CSV_CANDIDATES.join(', ')}`);
}

const STATUS_MAP = {
    'Advance shipping': 'IN_TRANSIT',
    'Late delivery': 'DELAYED',
    'Shipping on time': 'DELIVERED',
    'Shipping canceled': 'CANCELLED',
};

const AUDIT_TYPES = [
    'Route Compliance', 'Cold Chain Integrity', 'Financial Reconciliation',
    'Origin Verification', 'Sensor Calibration', 'Settlement Verification',
];
const AUDITOR_NAMES = [
    'Alex Rivera', 'Sarah Chen', 'Marcus Vega', 'Priya Patel',
    'James O\'Brien', 'System Bot',
];

function writePage(dir, pageNum, data) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `${pageNum}.json`), JSON.stringify(data));
}

function paginateAndWrite(baseDir, entityName, allItems, filterFn, filterKey) {
    // Write "all" pages
    const allDir = resolve(baseDir, 'all');
    let page = [];
    let pageNum = 1;
    for (let i = 0; i < allItems.length; i++) {
        page.push(allItems[i]);
        if (page.length === PAGE_SIZE) {
            writePage(allDir, pageNum, page);
            pageNum++;
            page = [];
        }
    }
    if (page.length > 0) writePage(allDir, pageNum, page);
    const totalPagesAll = pageNum - (page.length === 0 ? 1 : 0);

    // Group by filter key and write filtered pages
    const groups = {};
    for (const item of allItems) {
        const key = filterFn(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    }

    const filterMeta = {};
    for (const [key, items] of Object.entries(groups)) {
        const dir = resolve(baseDir, key);
        let p = [];
        let pn = 1;
        for (let i = 0; i < items.length; i++) {
            p.push(items[i]);
            if (p.length === PAGE_SIZE) {
                writePage(dir, pn, p);
                pn++;
                p = [];
            }
        }
        if (p.length > 0) writePage(dir, pn, p);
        filterMeta[key] = { total: items.length, pages: pn - (p.length === 0 ? 1 : 0) || 1 };
    }

    // Write meta.json
    const meta = {
        total: allItems.length,
        pages: totalPagesAll || 1,
        pageSize: PAGE_SIZE,
        filters: filterMeta,
    };
    writeFileSync(resolve(baseDir, 'meta.json'), JSON.stringify(meta));
    console.log(`[build-dataset] ${entityName}: ${allItems.length} records → ${totalPagesAll} pages, ${Object.keys(filterMeta).length} filter groups`);
}

async function main() {
    const csvPath = findCSV();
    console.log(`[build-dataset] Reading CSV from: ${csvPath}`);
    console.log(`[build-dataset] Page size: ${PAGE_SIZE}`);

    // Clean output directory
    if (existsSync(PUBLIC_DATA_DIR)) {
        rmSync(PUBLIC_DATA_DIR, { recursive: true });
    }
    mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

    const shipments = [];
    const alerts = [];
    const escrows = [];
    const audits = [];

    // Stats accumulators
    const statusCounts = {};
    let totalRisk = 0;
    let totalSales = 0;
    let fraudCount = 0;
    let tempViolations = 0;
    let routeDeviations = 0;
    let originMismatches = 0;
    const categoryCounts = {};
    const regionCounts = {};
    const shippingModeCounts = {};

    let rowIndex = 0;

    const parser = createReadStream(csvPath).pipe(
        parse({ columns: true, skip_empty_lines: true, trim: true })
    );

    for await (const row of parser) {
        rowIndex++;

        const status = STATUS_MAP[row.delivery_status] || 'CREATED';
        const riskScore = parseFloat(row.risk_score) || 0;
        const orderTotal = parseFloat(row.order_item_total) || 0;
        const temperature = parseFloat(row.temperature) || 0;
        const routeDevScore = parseFloat(row.route_deviation_score) || 0;
        const tempViolFlag = parseInt(row.temperature_violation_flag) || 0;
        const humidViolFlag = parseInt(row.humidity_violation_flag) || 0;
        const fraudLabel = parseInt(row.fraud_label) || 0;
        const originMismatch = parseInt(row.origin_mismatch_flag) || 0;

        // ── Shipment ─────────────────────────────────
        shipments.push({
            id: row.shipment_id,
            origin: `${row.order_city}, ${row.order_country}`,
            destination: `${row.customer_city}, ${row.customer_country}`,
            farmer_id: `F-${row.customer_id}`,
            status,
            risk_score: Math.round(riskScore * 10000) / 10000,
            created_at: row.order_date_dateorders,
            product: row.product_name || '',
            category: row.category_name || '',
            shipping_mode: row.shipping_mode || '',
        });

        // ── Alerts ───────────────────────────────────
        if (tempViolFlag === 1) {
            alerts.push({
                id: `ALT-T${rowIndex}`,
                shipment_id: row.shipment_id,
                severity: 'CRITICAL',
                type: 'TEMPERATURE_ANOMALY',
                timestamp: row.order_date_dateorders,
                status: 'OPEN',
                message: `Temperature anomaly: ${temperature.toFixed(1)}°C`,
            });
            tempViolations++;
        }
        if (routeDevScore > 0.05) {
            alerts.push({
                id: `ALT-R${rowIndex}`,
                shipment_id: row.shipment_id,
                severity: 'WARNING',
                type: 'ROUTE_DEVIATION',
                timestamp: row.order_date_dateorders,
                status: 'OPEN',
                message: `Route deviation score: ${routeDevScore.toFixed(3)}`,
            });
            routeDeviations++;
        }
        if (fraudLabel === 1) {
            alerts.push({
                id: `ALT-F${rowIndex}`,
                shipment_id: row.shipment_id,
                severity: 'CRITICAL',
                type: 'FRAUD_DETECTED',
                timestamp: row.order_date_dateorders,
                status: 'OPEN',
                message: `ML fraud detection triggered (risk: ${(riskScore * 100).toFixed(1)}%)`,
            });
            fraudCount++;
        }
        if (originMismatch === 1) {
            alerts.push({
                id: `ALT-M${rowIndex}`,
                shipment_id: row.shipment_id,
                severity: 'CRITICAL',
                type: 'ORIGIN_MISMATCH',
                timestamp: row.order_date_dateorders,
                status: 'OPEN',
                message: `Origin mismatch: claimed ${row.origin_claimed}, actual ${row.origin_actual}`,
            });
            originMismatches++;
        }

        // ── Escrow ───────────────────────────────────
        escrows.push({
            id: `ESC-${row.order_id}`,
            shipment_id: row.shipment_id,
            amount: `${(orderTotal / 1000).toFixed(3)} BTC`,
            status: status === 'DELIVERED' || status === 'CANCELLED' ? 'RELEASED' : 'HELD',
            counterparty: `${row.customer_fname} ${row.customer_lname}`,
            risk: Math.round(riskScore * 100),
            value: Math.round(orderTotal * 100) / 100,
        });

        // ── Audit ────────────────────────────────────
        const findings = tempViolFlag + humidViolFlag + (routeDevScore > 0.05 ? 1 : 0) + fraudLabel + originMismatch;
        audits.push({
            id: `AUD-${rowIndex}`,
            shipment_id: row.shipment_id,
            entity: row.shipment_id,
            type: AUDIT_TYPES[rowIndex % AUDIT_TYPES.length],
            auditor: AUDITOR_NAMES[rowIndex % AUDITOR_NAMES.length],
            status: findings > 0 ? (fraudLabel ? 'Failed' : 'Warning') : 'Passed',
            findings,
            timestamp: row.order_date_dateorders,
        });

        // ── Stats ────────────────────────────────────
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        totalRisk += riskScore;
        totalSales += orderTotal;
        categoryCounts[row.category_name] = (categoryCounts[row.category_name] || 0) + 1;
        regionCounts[row.order_region] = (regionCounts[row.order_region] || 0) + 1;
        shippingModeCounts[row.shipping_mode] = (shippingModeCounts[row.shipping_mode] || 0) + 1;
    }

    const totalRows = shipments.length;
    console.log(`[build-dataset] Processed ${totalRows} rows, ${alerts.length} alerts`);

    // ── Write pre-paginated files ────────────────────
    paginateAndWrite(resolve(PUBLIC_DATA_DIR, 'shipments'), 'Shipments', shipments, s => s.status, 'status');
    paginateAndWrite(resolve(PUBLIC_DATA_DIR, 'alerts'), 'Alerts', alerts, a => a.severity, 'severity');
    paginateAndWrite(resolve(PUBLIC_DATA_DIR, 'escrows'), 'Escrows', escrows, e => e.status, 'status');
    paginateAndWrite(resolve(PUBLIC_DATA_DIR, 'audits'), 'Audits', audits, a => a.status, 'status');

    // ── Write global stats ──────────────────────────
    const stats = {
        totalShipments: totalRows,
        totalAlerts: alerts.length,
        avgRiskScore: Math.round((totalRisk / totalRows) * 10000) / 10000,
        totalEscrowBTC: Math.round((totalSales / 1000) * 1000) / 1000,
        totalEscrowUSD: Math.round(totalSales * 100) / 100,
        statusCounts,
        fraudCount,
        tempViolations,
        routeDeviations,
        originMismatches,
        topCategories: Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count })),
        regionCounts,
        shippingModeCounts,
        passedAudits: audits.filter(a => a.status === 'Passed').length,
        failedAudits: audits.filter(a => a.status === 'Failed').length,
        warningAudits: audits.filter(a => a.status === 'Warning').length,
        criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
        warningAlerts: alerts.filter(a => a.severity === 'WARNING').length,
    };
    writeFileSync(resolve(PUBLIC_DATA_DIR, 'stats.json'), JSON.stringify(stats));
    console.log(`[build-dataset] Wrote stats.json`);

    console.log('[build-dataset] ✅ Done!');
}

main().catch(err => {
    console.error('[build-dataset] ❌ Failed:', err);
    process.exit(1);
});
