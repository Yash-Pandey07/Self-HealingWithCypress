const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, 'history.json');
let LATEST_RESULTS = path.join(__dirname, 'healing-results.json');
if (!fs.existsSync(LATEST_RESULTS)) {
    LATEST_RESULTS = path.join(__dirname, '../../cypress/reports/healing-results.json');
}

function readJsonSafe(filePath, fallback) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''); // strip BOM
        return JSON.parse(raw);
    } catch (e) {
        console.warn(`⚠️  Could not parse ${path.basename(filePath)}: ${e.message}. Using fallback.`);
        return fallback;
    }
}

function generateHistoricalData() {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        history = readJsonSafe(HISTORY_FILE, []);
    }

    let latestResults = [];
    if (fs.existsSync(LATEST_RESULTS)) {
        latestResults = readJsonSafe(LATEST_RESULTS, []);
    } else {
        console.log("No new results found. Creating empty entry for tracking.");
    }

    const runId        = process.env.GITHUB_RUN_ID       || 'local-' + Date.now();
    const runNumber    = process.env.GITHUB_RUN_NUMBER   || '0';
    const repository   = process.env.GITHUB_REPOSITORY  || "Yadavkumari/Self-HealingWithCypress";
    const branch       = process.env.GITHUB_REF_NAME    || "main";
    const sha          = process.env.GITHUB_SHA          || "unknown";
    const event        = process.env.GITHUB_EVENT_NAME  || "push";
    const workflowName = process.env.GITHUB_WORKFLOW    || "CI Self-Healing Test Suite";
    const generatedAt  = new Date().toISOString();

    const successHeals = latestResults.filter(r => r.success).length;
    const failedHeals  = latestResults.filter(r => !r.success).length;
    const totalTests   = latestResults.length || 1;
    const healRate     = latestResults.length > 0
        ? ((successHeals / latestResults.length) * 100).toFixed(1)
        : "100.0";
    const timeSaved    = (successHeals * 0.5).toFixed(1);

    // Flat summary entry — matches the QAi history.json array schema exactly
    const historySummary = {
        runId,
        runNumber,
        workflowName,
        repository,
        branch,
        commitSha: sha,
        event,
        generatedAt,
        totalRuns: history.length + 1,
        totalTestsCompleted: totalTests,
        totalSelectorHeals: successHeals,
        totalFlowHeals: 0,
        totalFailures: failedHeals,
        estimatedTimeSaved: timeSaved,
        healSuccessRate: healRate,
        file: `runs/${runId}.json`
    };

    // Map raw healing events → QAi event schema
    const mappedEvents = latestResults.map((r, i) => ({
        type: r.success ? "selector_recovery_applied" : "selector_recovery_failed",
        testId: r.intent || `step-${i}`,
        stepId: null,
        payload: {
            originalSelector: r.originalSelector,
            healedSelector: r.healedSelector || null,
            confidence: r.confidence,
            intent: r.intent,
            success: r.success
        },
        timestamp: r.timestamp
    }));

    // Rich nested payload — matches the QAi latest.json schema exactly
    const latestPayload = {
        generatedAt,
        mode: "ci",
        workflow: {
            name: workflowName,
            runNumber,
            runId,
            event,
            repository,
            branch,
            sha,
            serverUrl: "https://github.com"
        },
        stats: {
            totalRuns: history.length + 1,
            totalSelectorHeals: successHeals,
            totalFlowHeals: 0,
            totalFailures: failedHeals,
            totalTestsCompleted: totalTests,
            estimatedTimeSaved: timeSaved,
            healSuccessRate: healRate,
            gitBranch: branch
        },
        commits: [],
        status: {
            branch,
            changedFiles: [],
            diffStats: { added: 0, deleted: 0, files: 0 }
        },
        contributors: [],
        runs: [{
            runId,
            runStartedAt:  latestResults[0]?.timestamp || generatedAt,
            runFinishedAt: latestResults[latestResults.length - 1]?.timestamp || generatedAt,
            totalEvents: latestResults.length,
            selectorHeals: successHeals,
            flowHeals: 0,
            failures: failedHeals,
            healRejections: 0,
            testsCompleted: totalTests,
            testId: runId,
            totalSteps: latestResults.length,
            totalSelectorRecoveries: successHeals,
            totalFlowRecoveries: 0,
            urlsVisited: [],
            events: mappedEvents,
            durationMs: latestResults.length > 1
                ? new Date(latestResults[latestResults.length - 1].timestamp) - new Date(latestResults[0].timestamp)
                : 0
        }],
        memory: {}
    };

    // Save per-run raw data
    const runDir = path.join(__dirname, 'runs');
    if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, `${runId}.json`), JSON.stringify(latestResults, null, 2));

    fs.writeFileSync(path.join(__dirname, 'latest.json'), JSON.stringify(latestPayload, null, 2));

    history.unshift(historySummary);
    if (history.length > 250) history = history.slice(0, 250);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

    console.log(`✅ history.json and latest.json updated in exact reference format.`);
}

generateHistoricalData();
