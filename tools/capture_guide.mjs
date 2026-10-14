import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, '..');
const WWW_DIR = path.join(REPO, 'ui', 'www');
const SCREENSHOTS_DIR = path.join(REPO, 'docs', 'images', 'user-guide');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

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

    // 1. Desktop Context
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1.5,
    });
    const page = await desktopContext.newPage();

    console.log('Capturing Desktop Screenshots...');

    // 1.1 Overview Desktop
    await page.goto(`http://localhost:${PORT}/#/overview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-overview-desktop.png') });
    console.log('Saved 01-overview-desktop.png');

    // 1.2 Prioritization Board
    await page.goto(`http://localhost:${PORT}/#/prioritization`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-prioritization-board.png') });
    console.log('Saved 02-prioritization-board.png');

    // 1.3 Prioritization Table
    const tableBtn = page.locator('ion-segment-button[value="table"]');
    if (await tableBtn.isVisible()) {
      await tableBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-prioritization-table.png') });
      console.log('Saved 03-prioritization-table.png');
    }

    // 1.4 Hierarchy
    await page.goto(`http://localhost:${PORT}/#/hierarchy`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-hierarchy-rollups.png') });
    console.log('Saved 04-hierarchy-rollups.png');

    // 1.5 Power BI Direct Lake
    await page.goto(`http://localhost:${PORT}/#/powerbi`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-powerbi-directlake.png') });
    console.log('Saved 05-powerbi-directlake.png');

    // 1.6 Quick Add with Sample Template
    await page.goto(`http://localhost:${PORT}/#/quick-add`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const sampleChip = page.locator('.template-chip').first();
    if (await sampleChip.isVisible()) {
      await sampleChip.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-quick-add-prefill.png') });
    console.log('Saved 06-quick-add-prefill.png');

    // 1.7 Data Entry & Ingestion Sources
    await page.goto(`http://localhost:${PORT}/#/data-entry`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const uploadsTab = page.locator('ion-segment-button[value="uploads"]');
    if (await uploadsTab.isVisible()) {
      await uploadsTab.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-data-entry-ingestion.png') });
    console.log('Saved 07-data-entry-ingestion.png');

    // 1.8 Decisions Log
    await page.goto(`http://localhost:${PORT}/#/decisions`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-pmo-decisions-log.png') });
    console.log('Saved 08-pmo-decisions-log.png');

    // 1.9 Project Detail
    await page.goto(`http://localhost:${PORT}/#/projects/GIS-0001`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-project-detail.png') });
    console.log('Saved 09-project-detail.png');

    // 1.10 AI Copilot Agent FAB Open
    await page.goto(`http://localhost:${PORT}/#/overview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const fabBtn = page.locator('.copilot-fab-btn');
    if (await fabBtn.isVisible()) {
      await fabBtn.click();
      await page.waitForTimeout(1000);
      // Click prompt chip
      const promptBtn = page.locator('.prompt-chip').first();
      if (await promptBtn.isVisible()) {
        await promptBtn.click();
        await page.waitForTimeout(1500);
      }
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-ai-copilot-agent-fab.png') });
      console.log('Saved 10-ai-copilot-agent-fab.png');
    }

    await desktopContext.close();

    // 2. Tablet Viewport (iPad Air 820x1180)
    console.log('Capturing Tablet Screenshots...');
    const tabletContext = await browser.newContext({
      viewport: { width: 820, height: 1180 },
      deviceScaleFactor: 2,
    });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(`http://localhost:${PORT}/#/overview`, { waitUntil: 'networkidle' });
    await tabletPage.waitForTimeout(1200);
    await tabletPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-overview-tablet.png') });
    console.log('Saved 01-overview-tablet.png');
    await tabletContext.close();

    // 3. Mobile Viewport (iPhone 14 / modern smartphone 390x844)
    console.log('Capturing Mobile Screenshots...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`http://localhost:${PORT}/#/overview`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1200);
    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-overview-mobile.png') });
    console.log('Saved 01-overview-mobile.png');

    await mobilePage.goto(`http://localhost:${PORT}/#/prioritization`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1200);
    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-prioritization-mobile.png') });
    console.log('Saved 02-prioritization-mobile.png');

    await mobileContext.close();

    // 4. Generate User Guide in Markdown and PDF
    console.log('Generating User Guide Markdown and PDF...');
    await generateUserGuide(browser);

    await browser.close();
    server.close();
    console.log('All screenshots and User Guide generated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during capture:', err);
    server.close();
    process.exit(1);
  }
});

async function generateUserGuide(browser) {
  const guideMd = `# AI-Powered PMO Portfolio Prioritization — User Guide

Welcome to the **AI-Powered PMO Portfolio Prioritization** solution user manual. This platform integrates 11 disparate project management and business systems (Planview, Power Apps, Azure DevOps, JIRA, MS Project, Smartsheet, BU Trackers, HR Capacity, HR Roster, Finance, and Excel intake) into Microsoft Fabric OneLake, applies transparent Machine Learning (LightGBM + SHAP) and business rule governance (R1 to R5), and provides a high-fidelity, device-optimized interface for executives, PMO directors, and portfolio managers.

---

## Table of Contents

1. [Executive Portfolio Overview](#1-executive-portfolio-overview)
2. [Multi-Device Layout Optimization](#2-multi-device-layout-optimization)
3. [Prioritization Board & Table](#3-prioritization-board--table)
4. [Organizational Hierarchy & Rollups](#4-organizational-hierarchy--rollups)
5. [Power BI Direct Lake Executive Analytics](#5-power-bi-direct-lake-executive-analytics)
6. [Quick Add with AI Prefill](#6-quick-add-with-ai-prefill)
7. [Direct Data Entry & OneLake Ingestion](#7-direct-data-entry--onelake-ingestion)
8. [PMO Decisions & Human Governance Log](#8-pmo-decisions--human-governance-log)
9. [Project Deep Dive & SHAP Drivers](#9-project-deep-dive--shap-drivers)
10. [AI Portfolio Copilot (Agent FAB & Multi-Format Exports)](#10-ai-portfolio-copilot-agent-fab--multi-format-exports)

---

## 1. Executive Portfolio Overview

The **Overview** screen surfaces cross-dimensional machine learning insights, strategic priority tier allocations, confidence distributions, and workforce capacity analytics across all 100 enterprise projects.

![Executive Portfolio Overview Desktop](images/user-guide/01-overview-desktop.png)

### Key Capabilities:
- **Executive KPI Cards**: Real-time rollups of filtered project counts, Must-do-now counts, Proceed counts, average machine learning confidence (0-100%), average priority scores, and total capital spend in millions ($M).
- **Prioritization Tier Donut**: Visual breakdown of projects classified into *Must-do-now*, *Proceed*, *Can wait*, and *Candidate to deprioritize*.
- **Confidence Level Distribution by BU**: Analyzes signal completeness, source quality, and Platt-calibrated model certainty across each Business Unit.
- **Cost Allocation Treemap**: Hierarchical visualization of budget density by Business Unit and Site location.
- **Strategic Hierarchy Sunburst**: Multi-level concentric analysis showing Business Unit &gt; Site &gt; Tier.
- **Workforce Capacity Supply vs Demand**: FTE comparisons across 8 critical skill domains (Application Development, Cloud, Data, Cyber, Networks, UC, iPaaS, PM).
- **Completeness vs Data Quality Quadrant**: Scatter bubble chart correlating signal resolution with audit quality, sized by budget.

---

## 2. Multi-Device Layout Optimization

The application is engineered with an adaptive, fluid architecture delivering a cohesive experience across **Browser**, **Desktop**, **Tablet**, and **Mobile** viewports:

| Device Class | Viewport Range | Optimized Experience |
|---|---|---|
| **Desktop / Large Displays** | 1200px – 4K | 3-column split-pane layout: collapsible left navigation, active filter sidebar, interactive central workspace, and sliding project detail inspector. |
| **Tablet / Foldables** | 768px – 1199px | 2-column adaptive layout: collapsible side menu drawer, 2x2 responsive KPI grid, touch-friendly chart tooltips, and floating filter controls. |
| **Mobile Smartphones** | 320px – 767px | Single-column fluid stack: touch-accessible navigation bar, bottom-sheet slide drawers for filters and details, thumb-friendly tap targets, and swipeable board cards. |

<div style="display: flex; gap: 12px; margin: 16px 0;">
  <img src="images/user-guide/01-overview-tablet.png" alt="Tablet Layout" width="48%" />
  <img src="images/user-guide/01-overview-mobile.png" alt="Mobile Layout" width="48%" />
</div>

---

## 3. Prioritization Board & Table

The **Prioritization** workspace provides multiple lenses to examine, rank, and group all 100 projects in the portfolio:

![Prioritization Board View](images/user-guide/02-prioritization-board.png)

### Board View:
- Displays cards grouped by **Final Tier** (*Must-do-now*, *Proceed*, *Can wait*, *Candidate to deprioritize*) or customizable Group-By dimensions (*Confidence Level*, *Business Unit*, *Cluster*, *Action Lever*).
- Each project card displays the unique **GIS-####** identifier, project name, business unit, site, priority score badge, cost estimate, and confidence pill.
- Star icon toggle allows pinning key projects to an executive shortlist.

### Table View:
- High-density data grid featuring sticky headers, sortable columns (Priority Score, Project Name, Tier, Confidence, Cost, Go-Live Date, Sources Present, and Action Lever).
- Client-side pagination (10, 25, 50, 100 rows per page) and real-time faceted search filtering.

![Prioritization Table View](images/user-guide/03-prioritization-table.png)

---

## 4. Organizational Hierarchy & Rollups

The **Hierarchy** view provides aggregated rollups structured by **Business Unit &gt; Site &gt; Project**:

![Organizational Hierarchy Rollups](images/user-guide/04-hierarchy-rollups.png)

### Key Features:
- **Interactive Collapsible Tree**: Expand and collapse individual Business Units and Sites.
- **Aggregate Metrics**: Every node displays total project count, total capital commitment ($M), and weighted average confidence score.
- **Direct Project Selection**: Clicking any child project immediately selects it for detailed inspection.

---

## 5. Power BI Direct Lake Executive Analytics

The **Power BI** dashboard embeds an enterprise analytics experience backed directly by OneLake Delta parquet tables without data movement:

![Power BI Direct Lake Analytics](images/user-guide/05-powerbi-directlake.png)

### Key Features:
- **Zero-Copy Direct Lake Sync**: Reads directly from \`gold.pmo_predictions\` with sub-second response times.
- **Interactive Slicers**: Filter across Portfolios, Priority Tiers, and Business Units simultaneously.
- **Prioritization Scatter Matrix**: Quadrant analysis comparing Business Value (1-5) against Estimated Cost ($M).
- **Top 10 High-Impact Matrix**: Live ranking table with conditional mini-bars illustrating relative priority scores.
- **Live Fabric MSAL Embed**: Seamless Microsoft Entra ID authentication to embed the live report hosted in the Power BI Service.

---

## 6. Quick Add with AI Prefill

The **Quick Add** wizard allows business sponsors and PMs to submit project proposals in plain English and have Microsoft Foundry / Azure OpenAI automatically extract the 10 canonical PMO signals:

![Quick Add AI Prefill](images/user-guide/06-quick-add-prefill.png)

### Workflow:
1. **Pre-saved Sample Prompts**: One-click prompt chips populate realistic semiconductor, IoT, and cybersecurity proposals.
2. **AI Signal Extraction**: Azure OpenAI extracts Business Value, Regulatory Flag, Primary Skill, Cost Estimate, Risk Rating, and Effort person-weeks.
3. **Signal Provenance & Confidence**: Each field displays an extracted confidence score, evidence quote from the source text, and allows human overrides before OneLake submission.

---

## 7. Direct Data Entry & OneLake Ingestion

The **Data Entry** module allows direct ingestion, portfolio management, and monitoring of the 11 enterprise connectors:

![Data Entry & Ingestion Sources](images/user-guide/07-data-entry-ingestion.png)

### Key Capabilities:
- **Create Project**: Form-based creation with "Quick Fill Sample Values" for rapid testing.
- **Create Portfolio**: Register new portfolios and program taxonomies.
- **OneLake Ingestion Activity**: Status table detailing synchronization health, target schemas, formats, and record counts across Planview, ADO, JIRA, SAP Cost, and HR Roster.

---

## 8. PMO Decisions & Human Governance Log

The **Decisions** screen enforces the proposal principle: *"Keep people in control."* Every AI recommendation must be approved, adjusted, or rejected by human stakeholders:

![PMO Human Governance Log](images/user-guide/08-pmo-decisions-log.png)

### Features:
- **Record Governance Action**: Choose Action (*Approve*, *Adjust*, *Reject*), select target project, and enter mandatory justification.
- **Immutable Audit Trail**: Chronological log recording reviewer timestamps, action pills, and justification notes stored in OneLake.

---

## 9. Project Deep Dive & SHAP Drivers

Clicking any project opens the **Detail Inspector** displaying all 10 canonical signals, machine learning explainability, and rule overrides:

![Project Detail & SHAP Feature Drivers](images/user-guide/09-project-detail.png)

### Key Elements:
- **Confidence Ring Gauge**: Visual breakdown of Completeness, Quality, and Model Certainty.
- **SHAP Feature Importance Waterfall**: Explains *why* the model scored the project high or low (e.g. high business value increasing score by +0.72; high cost reducing score by -0.18).
- **Rule Overrides Badge**: Transparent indicators showing which deterministic business rules (R1 Regulatory First, R2 Executive Sponsorship, R3 Protected Programs, R4 Deprioritize Guard, R5 Cross-Portfolio Critical Path) altered the machine learning rank.
- **Cross-Source Provenance**: Checkmarks showing which of the 11 enterprise systems contributed data.

---

## 10. AI Portfolio Copilot (Agent FAB & Multi-Format Exports)

The **AI Portfolio Copilot** is accessible from any screen via the Floating Action Button (FAB) in the lower-right corner:

![AI Portfolio Copilot Agent FAB](images/user-guide/10-ai-copilot-agent-fab.png)

### Copilot Features:
- **Pulsing FAB**: High-visibility floating button with gradient styling and "Ask AI Agent" indicator.
- **Pre-Saved Sample Prompts**: Clickable chips for instant insights:
  - 💡 *Top 5 Must-Do-Now Projects*
  - 📊 *Budget by Business Unit*
  - 👥 *Skills Capacity Deficits*
  - 🔍 *Explain GIS-0042 Deprioritization*
  - 🛡️ *Regulatory & Security Projects*
  - ⚡ *R5 Critical Path Dependencies*
- **Table vs Chart Switcher**: Seamlessly toggle any Copilot response between a structured data table and an interactive chart.
- **Chart Type Selector**: Switch between **Bar**, **Line**, **Pie / Donut**, and **Radar / Spider** charts with a single click.
- **Multi-Format Export**: Export any Copilot answer directly to:
  - 📄 **Word (.docx)**
  - 📊 **Excel (.xlsx)**
  - 📑 **PowerPoint (.pptx)**

---

*AI-Powered PMO Portfolio Prioritization — Document generated October 2026*
`;

  const mdPath = path.join(REPO, 'docs', 'USER_GUIDE.md');
  fs.writeFileSync(mdPath, guideMd, 'utf-8');
  console.log(`Saved Markdown User Guide to ${mdPath}`);

  // Generate PDF from styled HTML
  console.log('Rendering PDF User Guide...');
  const pdfContext = await browser.newContext({ viewport: { width: 1200, height: 1600 } });
  const pdfPage = await pdfContext.newPage();

  // Convert markdown to clean HTML for PDF rendering
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PMO Portfolio Prioritization - User Guide</title>
  <style>
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      line-height: 1.6;
      color: #242424;
      max-width: 960px;
      margin: 0 auto;
      padding: 30px;
    }
    h1 {
      color: #0b1f3f;
      border-bottom: 3px solid #0078d4;
      padding-bottom: 10px;
      font-size: 26pt;
    }
    h2 {
      color: #0078d4;
      border-bottom: 1px solid #e1dfdd;
      padding-bottom: 6px;
      margin-top: 32px;
      font-size: 18pt;
      page-break-after: avoid;
    }
    h3 {
      color: #102644;
      margin-top: 20px;
      font-size: 14pt;
      page-break-after: avoid;
    }
    p, li {
      font-size: 10.5pt;
      color: #323130;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    th {
      background: #0078d4;
      color: #ffffff;
      padding: 8px 12px;
      text-align: left;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #edebe9;
    }
    tr:nth-child(even) td {
      background: #f8f9fa;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      border: 1px solid #edebe9;
      margin: 14px 0;
      page-break-inside: avoid;
    }
    code {
      background: #f3f2f1;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: Consolas, monospace;
      font-size: 9.5pt;
      color: #004578;
    }
    hr {
      border: none;
      border-top: 1px solid #edebe9;
      margin: 24px 0;
    }
    .cover-box {
      padding: 30px;
      background: linear-gradient(135deg, #0b1f3f 0%, #0078d4 100%);
      color: #ffffff;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .cover-box h1 {
      color: #ffffff;
      border-bottom: none;
      margin: 0;
    }
    .cover-box p {
      color: #e0f0fd;
      font-size: 13pt;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="cover-box">
    <h1>AI-Powered PMO Portfolio Prioritization</h1>
    <p>Comprehensive End-User Guide & Operational Walkthrough</p>
    <p style="font-size: 10pt; opacity: 0.85;">Microsoft Fabric OneLake • LightGBM + SHAP • Direct Lake Power BI • Ionic Angular</p>
  </div>

  <h2>1. Executive Portfolio Overview</h2>
  <p>The Overview dashboard synthesizes real-time metrics, LightGBM machine learning tier distribution, data quality confidence, and cross-functional workforce capacity.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '01-overview-desktop.png').replace(/\\/g, '/')}" alt="Overview" />

  <h2>2. Multi-Device Layout Optimization</h2>
  <p>The solution adapts responsively across Desktop browsers, Tablets (touch-optimized), and Smartphones with zero loss of capability.</p>
  <div style="display: flex; gap: 10px;">
    <img src="file://${path.join(SCREENSHOTS_DIR, '01-overview-tablet.png').replace(/\\/g, '/')}" style="width: 49%;" />
    <img src="file://${path.join(SCREENSHOTS_DIR, '01-overview-mobile.png').replace(/\\/g, '/')}" style="width: 49%;" />
  </div>

  <h2>3. Prioritization Board & Table</h2>
  <p>Enables portfolio managers to visualize projects categorized by priority tier, sort by multi-signal rank, and inspect high-density data matrices.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '02-prioritization-board.png').replace(/\\/g, '/')}" alt="Board" />
  <img src="file://${path.join(SCREENSHOTS_DIR, '03-prioritization-table.png').replace(/\\/g, '/')}" alt="Table" />

  <h2>4. Organizational Hierarchy & Rollups</h2>
  <p>Inspects portfolio allocations through an expandable Business Unit &gt; Site &gt; Project tree with cost and confidence rollups.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '04-hierarchy-rollups.png').replace(/\\/g, '/')}" alt="Hierarchy" />

  <h2>5. Power BI Direct Lake Executive Analytics</h2>
  <p>Delivers zero-copy direct lake analytics over OneLake Gold delta tables with scatter quadrant matrices and budget distribution.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '05-powerbi-directlake.png').replace(/\\/g, '/')}" alt="Power BI" />

  <h2>6. Quick Add with AI Prefill</h2>
  <p>Business sponsors input plain-English proposals or choose sample prompts, allowing Azure OpenAI to extract the 10 canonical PMO signals automatically.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '06-quick-add-prefill.png').replace(/\\/g, '/')}" alt="Quick Add" />

  <h2>7. Direct Data Entry & Ingestion Sources</h2>
  <p>Provides unified project forms and a dashboard monitoring the 11 enterprise connectors in OneLake Bronze and Silver layers.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '07-data-entry-ingestion.png').replace(/\\/g, '/')}" alt="Data Entry" />

  <h2>8. PMO Human Governance Audit Log</h2>
  <p>Enforces human governance over AI recommendations with audit trails recording approvals, adjustments, and rejections.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '08-pmo-decisions-log.png').replace(/\\/g, '/')}" alt="Decisions" />

  <h2>9. Project Detail & SHAP Feature Drivers</h2>
  <p>Inspects individual projects with confidence ring breakdowns, SHAP importance waterfalls, and Rule R1-R5 audit badges.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '09-project-detail.png').replace(/\\/g, '/')}" alt="Project Detail" />

  <h2>10. AI Portfolio Copilot & Multi-Format Exports</h2>
  <p>The floating action button (FAB) activates the Copilot chat drawer, providing sample prompt chips, table-to-chart switches (Bar, Line, Pie, Radar), and exports to Word, Excel, and PowerPoint.</p>
  <img src="file://${path.join(SCREENSHOTS_DIR, '10-ai-copilot-agent-fab.png').replace(/\\/g, '/')}" alt="Copilot FAB" />
</body>
</html>
  `;

  await pdfPage.setContent(htmlContent, { waitUntil: 'networkidle' });
  await pdfPage.waitForTimeout(1500);

  const pdfPath = path.join(REPO, 'docs', 'USER_GUIDE.pdf');
  await pdfPage.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '12mm',
      right: '12mm',
    },
  });
  console.log(`Saved PDF User Guide to ${pdfPath}`);
  await pdfContext.close();
}
