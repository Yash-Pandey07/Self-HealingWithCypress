const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, 'history.json');
let LATEST_RESULTS = path.join(__dirname, 'healing-results.json');
// If not found in src/tools (CI path), look in the default cypress reports path (local path)
if (!fs.existsSync(LATEST_RESULTS)) {
    LATEST_RESULTS = path.join(__dirname, '../../cypress/reports/healing-results.json');
}
const packageJson = require(path.join(__dirname, '../../package.json'));

function generateHistoricalData() {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }

    let latestResults = [];
    if (fs.existsSync(LATEST_RESULTS)) {
        latestResults = JSON.parse(fs.readFileSync(LATEST_RESULTS, 'utf8'));
    } else {
        console.log("No new results found. Creating empty entry for tracking.");
    }

    const runId = process.env.GITHUB_RUN_ID || 'local-' + Date.now();
    const runNumber = process.env.GITHUB_RUN_NUMBER || '0';

    const stats = {
        runId: runId,
        runNumber: runNumber,
        workflowName: process.env.GITHUB_WORKFLOW || "CI Self-Healing Test Suite",
        repository: process.env.GITHUB_REPOSITORY || "Yadavkumari/Self-HealingWithCypress",
        branch: process.env.GITHUB_REF_NAME || "main",
        commitSha: process.env.GITHUB_SHA || "unknown",
        event: process.env.GITHUB_EVENT_NAME || "push",
        generatedAt: new Date().toISOString(),
        totalRuns: history.length + 1,
        totalTestsCompleted: latestResults.length || 1,
        totalSelectorHeals: latestResults.filter(r => r.success).length,
        totalFlowHeals: 0,
        totalFailures: latestResults.filter(r => !r.success).length,
        estimatedTimeSaved: (latestResults.filter(r => r.success).length * 0.5).toFixed(1),
        healSuccessRate: latestResults.length > 0
            ? ((latestResults.filter(r => r.success).length / latestResults.length) * 100).toFixed(1)
            : "100.0",
        file: `runs/${runId}.json`
    };

    // Save individual run data
    const runDir = path.join(__dirname, 'runs');
    if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, `${runId}.json`), JSON.stringify(latestResults, null, 2));

    // Create latest.json with full run payload (stats + all healing events)
    const latestWithPayload = {
        ...stats,
        events: latestResults
    };
    fs.writeFileSync(path.join(__dirname, 'latest.json'), JSON.stringify(latestWithPayload, null, 2));

    // Update history (keep top 250 runs)
    history.unshift(stats);
    if (history.length > 250) history = history.slice(0, 250);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`✅ history.json and latest.json updated in exact reference format.`);
}

generateHistoricalData();
