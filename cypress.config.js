const { defineConfig } = require("cypress");
const fs = require('fs');
const path = require('path');

// Keyword → selector map covering every intent used in the test suite.
// Used as fallback when AI is unavailable or quota is exhausted.
const HEURISTIC_MAP = [
  { keywords: ['email'],                  selector: "input[type='email'], input[name='email'], input[placeholder*='email' i]",         confidence: 0.95 },
  { keywords: ['password'],               selector: "input[type='password'], input[name='password']",                                   confidence: 0.97 },
  { keywords: ['login', 'submit', 'sign'],selector: "button[type='submit'], form button, button.rw-btn-primary",                        confidence: 0.90 },
  { keywords: ['product', 'nav', 'menu'], selector: "nav a, a[href*='product'], a[href*='catalog']",                                    confidence: 0.85 },
  { keywords: ['cart', 'add'],            selector: "button[class*='cart' i], button[class*='add' i], button.rw-btn-primary",           confidence: 0.85 },
  { keywords: ['cart', 'badge', 'count'], selector: ".rw-pill, [class*='badge' i], [class*='cart-count' i]",                           confidence: 0.80 },
  { keywords: ['checkout'],              selector: "button[class*='checkout' i], a[href*='checkout']",                                  confidence: 0.80 },
  { keywords: ['search'],                selector: "input[type='search'], input[placeholder*='search' i]",                              confidence: 0.88 },
];

function heuristicHeal(intent) {
  const normalized = intent.toLowerCase();
  for (const rule of HEURISTIC_MAP) {
    if (rule.keywords.some(k => normalized.includes(k))) {
      return { healedSelector: rule.selector, confidence: rule.confidence, rationale: 'Heuristic keyword match' };
    }
  }
  return null;
}

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://retail-website-two.vercel.app',
    viewportWidth: 1280,
    viewportHeight: 800,
    setupNodeEvents(on, config) {
      on('task', {
        async healSelector({ intent, domSnapshot, stepId, originalSelector }) {
          require('dotenv').config();
          const apiKey = process.env.GEMINI_API_KEY || process.env.CYPRESS_GEMINI_API_KEY;

          let healedSelector = null;
          let confidence = 0;
          let rationale = 'Derived via AI Analysis';
          let source = 'ai';

          // Try AI first — skip entirely if no key configured
          if (apiKey) {
            try {
              console.log(`\n🤖 [AI] Gemini healing: "${intent}"`);
              const { GoogleGenerativeAI } = require("@google/generative-ai");
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

              const prompt = `
                As an expert QA Automation Engineer, find the best CSS selector for an element.
                TARGET INTENT: "${intent}"
                BROKEN SELECTOR: "${originalSelector}"
                DOM CONTEXT: ${JSON.stringify(domSnapshot)}
                RULES:
                1. Favor [data-testid], [id], [name], [aria-label], [type] in that order.
                2. Return ONLY valid JSON: {"selector": "string", "confidence": number, "rationale": "string"}
              `;

              const result = await model.generateContent(prompt);
              const text = result.response.text();
              const jsonMatch = text.match(/\{[\s\S]*?\}/);
              const aiData = JSON.parse(jsonMatch ? jsonMatch[0] : text);

              healedSelector = aiData.selector;
              confidence = aiData.confidence;
              rationale = aiData.rationale;
            } catch (e) {
              console.warn(`⚠️  AI unavailable (${e.message.slice(0, 60)}). Using heuristics.`);
              source = 'heuristic';
            }
          } else {
            console.log(`ℹ️  No GEMINI_API_KEY — using heuristics for: "${intent}"`);
            source = 'heuristic';
          }

          // Heuristic fallback
          if (!healedSelector) {
            const match = heuristicHeal(intent);
            if (match) {
              ({ healedSelector, confidence, rationale } = match);
            } else {
              // DOM-based last resort: return first visible button or input
              healedSelector = "button:visible, input:visible";
              confidence = 0.40;
              rationale = 'DOM last-resort fallback';
              source = 'fallback';
            }
          }

          console.log(`✅ [${source.toUpperCase()}] Healed "${intent}" → ${healedSelector} (${(confidence*100).toFixed(0)}%)`);

          // Audit log
          const reportPath = path.resolve(__dirname, 'healing-report.md');
          const entry = `\n## Healing Event: ${new Date().toLocaleString()}\n- **Intent:** ${intent}\n- **Source:** ${source}\n- **Selector:** \`${healedSelector}\`\n- **Confidence:** ${(confidence*100).toFixed(0)}%\n- **Rationale:** ${rationale}\n---`;
          if (!fs.existsSync(reportPath)) fs.writeFileSync(reportPath, '# Self-Healing Audit Report\n');
          fs.appendFileSync(reportPath, entry);

          // Write to healing-results.json for dashboard
          const resultsPath = path.resolve(__dirname, 'cypress/reports/healing-results.json');
          const resultsDir = path.dirname(resultsPath);
          if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
          let results = [];
          if (fs.existsSync(resultsPath)) {
            try { results = JSON.parse(fs.readFileSync(resultsPath, 'utf8')); } catch {}
          }
          results.push({ timestamp: new Date().toISOString(), intent, originalSelector, healedSelector, confidence, success: confidence > 0.5, source });
          fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

          return { healedSelector, confidence };
        }
      });
      return config;
    },
  },
});
