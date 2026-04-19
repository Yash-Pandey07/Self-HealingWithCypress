# 🤖 Agentic AI Self-Healing Framework (Cypress)

This project demonstrates a production-grade self-healing automation framework built with Cypress and AI (Gemini/OpenAI). 

## 🌟 Why This Exists
Traditional automation breaks when the UI changes (CSS classes change, structure shifts). This framework adds an **Agent Layer** on top of Cypress to make tests resilient.

## 🏗️ Architecture
Following the "Agentic Framework Design", we've implemented:
- **Execution Layer**: Cypress + Page Object Model.
- **Agent Layer**: AI-powered `SelectorRecoveryAgent`.
- **Memory Layer**: `SelectorMemoryStore` to cache successful heals.
- **Telemetry Layer**: `HealingReportWriter` for rich markdown artifacts.
- **Tooling**: `DomSnapshotTool` for token-efficient DOM analysis.

## 🚀 How to Run
1. **Setup**:
   ```bash
   npm install
   ```
2. **Configure API Key**:
   - Copy `.env.example` to `.env`.
   - Add your `GEMINI_API_KEY`. (The framework will use **Mock Intelligence** if no key is provided).
3. **Run Showcase**:
   ```bash
   npx cypress run --spec cypress/e2e/self_healing_showcase.cy.js
   ```

## 📋 Healing Process
1. Test step fails with a broken selector.
2. AI Agent captures a DOM snapshot.
3. Agent analyzes the DOM vs the expected element description.
4. Agent provides a new stable CSS selector with a confidence score.
5. Framework retries the action, persists the heal to memory, and continues.
6. A rich `healing-report.md` is generated at the end.

---
**Target Website**: [Retail App Dashboard](https://retail-website-two.vercel.app/app/dashboard)
   