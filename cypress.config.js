const { defineConfig } = require("cypress");
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://retail-website-two.vercel.app',
    viewportWidth: 1280,
    viewportHeight: 800,
    setupNodeEvents(on, config) {
      on('task', {
        /**
         * The Node.js Agent - Heals selectors based on intent
         */
        async healSelector({ intent, domSnapshot, stepId, originalSelector }) {
          console.log(`\n🤖 [AI AGENT] Gemini-1.5-Pro Healing: "${intent}"`);
          
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          require('dotenv').config();

          let healedSelector = null;
          let confidence = 0;
          let rationale = "Derived via AI Analysis";

          try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.CYPRESS_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
              As an expert QA Automation Engineer, find the best CSS or XPath selector for an element I'm looking for.
              
              TARGET INTENT: "${intent}"
              BROKEN SELECTOR: "${originalSelector}"
              
              DOM CONTEXT (Simplified):
              ${JSON.stringify(domSnapshot)}
              
              RULES:
              1. Favor [data-testid], [id], [name], [aria-label], or [type] in that order.
              2. Return ONLY a JSON object with this structure: {"selector": "string", "confidence": number, "rationale": "string"}
              3. If you use XPath, ensure it is stable.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Extract JSON from potential markdown blocks
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const aiData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
            
            healedSelector = aiData.selector;
            confidence = aiData.confidence;
            rationale = aiData.rationale;

          } catch (e) {
            console.warn("⚠️ Gemini Call Failed or Timed out. Falling back to Heuristics.");
            // Fallback heuristics (keeping your safe rules)
            const normalizedIntent = intent.toLowerCase();
            if (normalizedIntent.includes('email')) { healedSelector = "//input[@type='email']"; confidence = 0.95; }
            else if (normalizedIntent.includes('password')) { healedSelector = "//input[@type='password']"; confidence = 0.98; }
            else { throw e; }
          }

          // Auditing (Markdown)
          const reportPath = path.resolve(__dirname, 'healing-report.md');
          const timestamp = new Date().toLocaleString();
          const reportEntry = `
## 🛠 Healing Event: ${timestamp}
- **Intent:** ${intent}
- **AI Recommendation:** \`${healedSelector}\`
- **Confidence:** \`${(confidence * 100).toFixed(2)}%\`
- **Rationale:** ${rationale}
---
`;
          if (!fs.existsSync(reportPath)) {
            fs.writeFileSync(reportPath, '# 🛡 Agentic Self-Healing Audit Report\n\n');
          }
          fs.appendFileSync(reportPath, reportEntry);

          return { healedSelector, confidence };
        }
      });
      return config;
    },
  },
});
