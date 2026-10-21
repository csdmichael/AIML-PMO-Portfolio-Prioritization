import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..', '..');
const WWW_DIR = path.join(REPO, 'ui', 'www');
const SCREENSHOTS_DIR = path.join(REPO, 'docs', 'images', 'user-guide');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Load sample mock datasets
const datasetPath = path.join(WWW_DIR, 'assets', 'data', 'sample-portfolio.json');
const portfoliosPath = path.join(WWW_DIR, 'assets', 'data', 'sample-portfolios.json');
const decisionsPath = path.join(WWW_DIR, 'assets', 'data', 'sample-decisions.json');
const dataEntryCfgPath = path.join(REPO, 'config', 'data-entry.json');

const dataset = fs.existsSync(datasetPath) ? JSON.parse(fs.readFileSync(datasetPath, 'utf8')) : { projects: [] };
const portfolios = fs.existsSync(portfoliosPath) ? JSON.parse(fs.readFileSync(portfoliosPath, 'utf8')) : [];
const decisions = fs.existsSync(decisionsPath) ? JSON.parse(fs.readFileSync(decisionsPath, 'utf8')) : [];
const dataEntryCfg = fs.existsSync(dataEntryCfgPath) ? JSON.parse(fs.readFileSync(dataEntryCfgPath, 'utf8')) : { projectFields: [], options: {} };

const optionsResponse = {
  schemaVersion: 1,
  description: 'Shared PMO data-entry contract',
  projectIdPattern: '^GIS-\\d{4}$',
  options: dataEntryCfg.options,
  projectFields: dataEntryCfg.projectFields,
  portfolioFields: [],
  uploads: {
    maxFilesPerSourcePerProject: 5,
    maxFileBytes: 10485760,
    acceptedBySource: {
      charter: { extensions: ['.pdf', '.docx', '.txt'] },
      business_case: { extensions: ['.xlsx', '.pdf'] },
      architecture: { extensions: ['.docx', '.pdf'] },
      risk_assessment: { extensions: ['.xlsx', '.pdf'] },
      other: { extensions: ['.pdf', '.docx', '.txt', '.xlsx', '.md', '.csv', '.json'] },
    },
  },
};

const sampleProjectDetail = dataset.projects?.find((p) => p.projectId === 'GIS-0001') || {
  projectId: 'GIS-0001',
  projectName: 'Edge Network Segmentation Refresh',
  portfolio: 'IT InfoSec',
  portfolioKey: 'it-infosec',
  program: 'Zero Trust and Identity',
  programKey: 'zero-trust-identity',
  businessUnit: 'Semiconductor Process Equipment',
  site: 'Singapore',
  projectManager: 'Mateo Okafor',
  executiveSponsor: 'Dmitri Nakamura',
  sponsorLevel: 'Director',
  projectStatus: 'Active',
  goLiveDate: '2028-06-02',
  monthsToGoLive: 29,
  businessValue: 4,
  regulatorySecurity: true,
  dtAlignment: true,
  protectedProgram: false,
  primarySkill: 'Cloud and Infrastructure',
  skillDemandFte: 8.3,
  costEstimateUsd: 2635974,
  dependencyCount: 1,
  riskRating: 'High',
  effortPersonWeeks: 25,
  sourcesPresent: 11,
  sourcesTotal: 11,
  confidenceScore: 88,
  confidenceLevel: 'High',
  mlTier: 'Must-do-now',
  finalTier: 'Must-do-now',
  priorityScore: 82.5,
  mlBaseScore: 85.0,
  fieldWeightedScore: 80.8,
  priorityWeightScope: 'portfolio',
  effectivePriorityWeights: {
    businessValue: 0.25,
    userBase: 0.1,
    regulatorySecurity: 0.15,
    timingUrgency: 0.1,
    sponsorPriority: 0.1,
    dtAlignment: 0.1,
    risk: 0.1,
    cost: 0.1,
  },
  cluster: 'Security & Identity',
  recommendedAction: 'Protect slot',
  fieldProvenance: {
    projectName: { source: 'human', confidenceScore: 100, confidenceLevel: 'Human', rationale: 'Direct user entry' },
    portfolioKey: { source: 'ai', confidenceScore: 92, confidenceLevel: 'High', rationale: 'Matched IT InfoSec scope' },
    programKey: { source: 'ai', confidenceScore: 88, confidenceLevel: 'High', rationale: 'Classified under Zero Trust' },
    primarySkill: { source: 'ai', confidenceScore: 85, confidenceLevel: 'High', rationale: 'Cloud architecture skill profile' },
    businessValue: { source: 'ai', confidenceScore: 85, confidenceLevel: 'High', rationale: 'Derived from executive charter' },
    costEstimateUsd: { source: 'human', confidenceScore: 100, confidenceLevel: 'Human', rationale: 'Finance budget approval' },
    riskRating: { source: 'ai', confidenceScore: 78, confidenceLevel: 'Medium', rationale: 'Calculated from architecture dependencies' },
    regulatorySecurity: { source: 'ai', confidenceScore: 95, confidenceLevel: 'High', rationale: 'ISO-27001 regulatory trigger' },
    dtAlignment: { source: 'ai', confidenceScore: 82, confidenceLevel: 'High', rationale: 'Digital transformation core pillar' },
    effortPersonWeeks: { source: 'human', confidenceScore: 100, confidenceLevel: 'Human', rationale: 'PM estimated workload' },
  },
};

const sampleUploads = [
  { uploadId: 'u1', fileName: 'GIS-0001_Project_Charter_v2.pdf', sizeBytes: 245760, sourceKey: 'charter', uploadedAt: '2026-10-14' },
  { uploadId: 'u2', fileName: 'Architecture_Design_Specification.docx', sizeBytes: 524288, sourceKey: 'architecture', uploadedAt: '2026-10-16' },
  { uploadId: 'u3', fileName: 'Business_Case_Financial_Model.xlsx', sizeBytes: 112640, sourceKey: 'business_case', uploadedAt: '2026-10-18' },
];

// MIME types for static server
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(WWW_DIR, urlPath === '/' ? 'index.html' : urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(WWW_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 4288;
server.listen(PORT, async () => {
  console.log(`Static server running at http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({ headless: true });

    const setupApiMocking = async (ctx) => {
      await ctx.route('**/api/v1/**', async (route) => {
        const url = route.request().url();
        if (url.includes('/admin/settings')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: { isDemoEnvironment: true, environmentName: 'demo' } });
        }
        if (url.includes('/options')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: optionsResponse });
        }
        if (url.includes('/portfolios')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: { items: portfolios, count: portfolios.length } });
        }
        if (url.includes('/projects/GIS-0001/uploads')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: sampleUploads });
        }
        if (url.includes('/projects/GIS-0001/recalculate')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: { ...sampleProjectDetail, priorityScore: 84.2, finalTier: 'Must-do-now' } });
        }
        if (url.includes('/projects/GIS-0001')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: sampleProjectDetail });
        }
        if (url.includes('/demo/projects')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: { projectCount: 100, portfolios: [] } });
        }
        if (url.includes('/decisions')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: { items: decisions, count: decisions.length } });
        }
        if (url.includes('/capacity/scenarios')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: dataset.capacityBySkill || [] });
        }
        if (url.includes('/portfolio')) {
          return route.fulfill({ status: 200, contentType: 'application/json', json: dataset });
        }
        return route.continue();
      });
    };

    // 1. Desktop Context
    console.log('Capturing Desktop Screenshots...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1.5,
    });
    await setupApiMocking(desktopContext);
    const page = await desktopContext.newPage();

    // Scene 0: Demo Controls (Clear & Load 100 demo projects)
    console.log('0. Capturing Demo Controls...');
    await page.goto(`http://localhost:${PORT}/data-entry`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const importTab = page.locator('button:has-text("Import & Uploads"), [role="tab"]:has-text("Import")').first();
    if (await importTab.isVisible()) {
      await importTab.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '00-demo-clear-and-load.png') });
    console.log('Saved 00-demo-clear-and-load.png');

    // Scene 1: Executive Portfolio Overview
    console.log('1. Capturing Executive Overview...');
    await page.goto(`http://localhost:${PORT}/overview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const detailsEl = page.locator('details summary').first();
    if (await detailsEl.isVisible()) {
      await detailsEl.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-overview-desktop.png') });
    console.log('Saved 01-overview-desktop.png');

    // Scene 2: Prioritization Board with Pagination
    console.log('2. Capturing Prioritization Board...');
    await page.goto(`http://localhost:${PORT}/prioritization`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-prioritization-board.png') });
    console.log('Saved 02-prioritization-board.png');

    // Scene 3: Prioritization Table with Pagination
    console.log('3. Capturing Prioritization Table...');
    const tableBtn = page.locator('ion-segment-button[value="table"]');
    if (await tableBtn.isVisible()) {
      await tableBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-prioritization-table.png') });
    console.log('Saved 03-prioritization-table.png');

    // Scene 4: Trashed Projects Screen (/trash)
    console.log('4. Capturing Trashed Projects Screen...');
    await page.goto(`http://localhost:${PORT}/trash`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-trashed-projects.png') });
    console.log('Saved 04-trashed-projects.png');

    // Scene 5: Data Entry Create Project with AI Prefill
    console.log('5. Capturing Data Entry Create Project...');
    await page.goto(`http://localhost:${PORT}/data-entry`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.locator('input[placeholder*="Name the project"]').fill('Next-Gen Automated Threat Intelligence Exchange');
    await page.locator('textarea[placeholder*="Describe the business objectives"]').fill('Cloud-native automated security orchestration platform integrating threat intelligence feeds with SIEM/SOAR.');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-data-entry-ai-prefill.png') });
    console.log('Saved 05-data-entry-ai-prefill.png');

    // Scene 6: URL-Based Edit Project (Field Provenance)
    console.log('6. Capturing URL-Based Edit Project (Field Provenance)...');
    await page.goto(`http://localhost:${PORT}/projects/GIS-0001/edit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-edit-project-provenance.png') });
    console.log('Saved 06-edit-project-provenance.png');

    // Scene 7: Edit Project Supporting Documents & Recalculate
    console.log('7. Capturing Edit Project Supporting Documents...');
    const docsTab = page.locator('.tab-btn:has-text("Supporting Documents")');
    if (await docsTab.isVisible()) {
      await docsTab.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-edit-project-documents-recalc.png') });
    console.log('Saved 07-edit-project-documents-recalc.png');

    // Scene 8: Calculation Transparency & ML Methodology
    console.log('8. Capturing Calculation Transparency...');
    const transTab = page.locator('.tab-btn:has-text("Calculation Transparency")');
    if (await transTab.isVisible()) {
      await transTab.click();
      await page.waitForTimeout(1200);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-calculation-transparency-methodology.png') });
    console.log('Saved 08-calculation-transparency-methodology.png');

    // Scene 9: Project Detail & SHAP Feature Drivers
    console.log('9. Capturing Project Detail...');
    await page.goto(`http://localhost:${PORT}/projects/GIS-0001`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-project-detail.png') });
    console.log('Saved 09-project-detail.png');

    // Scene 10: Hierarchy Rollups
    console.log('10. Capturing Hierarchy...');
    await page.goto(`http://localhost:${PORT}/hierarchy`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-hierarchy-rollups.png') });
    console.log('Saved 10-hierarchy-rollups.png');

    // Scene 11: Decisions Log
    console.log('11. Capturing Decisions Log...');
    await page.goto(`http://localhost:${PORT}/decisions`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-pmo-decisions-log.png') });
    console.log('Saved 11-pmo-decisions-log.png');

    // Scene 12: Executive Analytics / Power BI
    console.log('12. Capturing Executive Analytics...');
    await page.goto(`http://localhost:${PORT}/powerbi`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-executive-analytics.png') });
    console.log('Saved 12-executive-analytics.png');

    // Scene 13: AI Copilot FAB
    console.log('13. Capturing AI Copilot FAB...');
    await page.goto(`http://localhost:${PORT}/overview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const fabBtn = page.locator('.copilot-fab-btn, button:has-text("Ask AI Assistant")').first();
    if (await fabBtn.isVisible()) {
      await fabBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-ai-copilot-agent-fab.png') });
    console.log('Saved 13-ai-copilot-agent-fab.png');

    await desktopContext.close();

    // 2. Tablet Viewport (iPad Air 820x1180)
    console.log('Capturing Tablet Screenshots...');
    const tabletContext = await browser.newContext({
      viewport: { width: 820, height: 1180 },
      deviceScaleFactor: 2,
    });
    await setupApiMocking(tabletContext);
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(`http://localhost:${PORT}/overview`, { waitUntil: 'networkidle' });
    await tabletPage.waitForTimeout(1500);
    await tabletPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-overview-tablet.png') });
    console.log('Saved 01-overview-tablet.png');
    await tabletContext.close();

    // 3. Mobile Viewport (iPhone 14 390x844)
    console.log('Capturing Mobile Screenshots...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await setupApiMocking(mobileContext);
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`http://localhost:${PORT}/overview`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-overview-mobile.png') });
    console.log('Saved 01-overview-mobile.png');

    await mobilePage.goto(`http://localhost:${PORT}/prioritization`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-prioritization-mobile.png') });
    console.log('Saved 02-prioritization-mobile.png');
    await mobileContext.close();

    // 4. Generate PDF from USER_GUIDE.md
    console.log('Rendering PDF User Guide from Markdown...');
    const pdfContext = await browser.newContext({ viewport: { width: 1200, height: 1600 } });
    const pdfPage = await pdfContext.newPage();
    const mdContent = fs.readFileSync(path.join(REPO, 'docs', 'USER_GUIDE.md'), 'utf8');

    // Simple markdown-to-html converter for PDF generation
    const htmlBody = mdContent
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, (match, alt, src) => {
        const fullSrc = path.join(REPO, 'docs', src);
        if (fs.existsSync(fullSrc)) {
          const base64 = fs.readFileSync(fullSrc).toString('base64');
          return `<div class="img-container"><img alt="${alt}" src="data:image/png;base64,${base64}" /></div>`;
        }
        return '';
      })
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br/>');

    const fullHtml = `<!DOCTYPE html><html><head><style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 40px; }
      h1 { color: #0f172a; border-bottom: 2px solid #0078d4; padding-bottom: 8px; }
      h2 { color: #0078d4; margin-top: 30px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; page-break-after: avoid; }
      h3 { color: #334155; page-break-after: avoid; }
      img { max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; margin: 12px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .img-container { text-align: center; margin: 16px 0; page-break-inside: avoid; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    </style></head><body>${htmlBody}</body></html>`;

    await pdfPage.setContent(fullHtml, { waitUntil: 'load' });
    await pdfPage.pdf({
      path: path.join(REPO, 'docs', 'USER_GUIDE.pdf'),
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    });
    console.log('Saved USER_GUIDE.pdf');
    await pdfContext.close();

    await browser.close();
    server.close();
    console.log('All high-fidelity screenshots & PDF successfully generated!');
    process.exit(0);
  } catch (err) {
    console.error('Error during screenshot capture:', err);
    server.close();
    process.exit(1);
  }
});
