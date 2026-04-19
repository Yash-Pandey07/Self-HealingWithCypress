/**
 * HIGH-OBSERVABILITY CTO DASHBOARD (Application UI)
 */

const getBannerDoc = (win) => win.document;

const updateBanner = (win, text, type) => {
    const doc = getBannerDoc(win);
    let banner = doc.getElementById('cto-visual-logger');
    
    if (!banner) {
        banner = doc.createElement('div');
        banner.id = 'cto-visual-logger';
        banner.style.cssText = `
            position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
            z-index: 2147483647; width: 600px; padding: 20px;
            background: rgba(0,0,0,0.9); border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: white; text-align: center; border: 2px solid #555;
            transition: all 0.3s ease;
        `;
        doc.body.appendChild(banner);
    }

    const configs = {
        info: { color: '#00AAFF', icon: '🔍', label: 'MONITORING' },
        retry: { color: '#FFAA00', icon: '⏳', label: 'RETRYING' },
        fail: { color: '#FF4444', icon: '⚠️', label: 'LOCATOR FAILED' },
        heal: { color: '#39FF14', icon: '🤖', label: 'AI HEALING ACTIVE' }
    };

    const cfg = configs[type] || configs.info;
    banner.style.borderColor = cfg.color;
    banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <div style="font-size: 32px;">${cfg.icon}</div>
            <div style="text-align: left;">
                <div style="color: ${cfg.color}; font-weight: bold; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">
                    ${cfg.label}
                </div>
                <div style="font-size: 18px; margin-top: 4px; font-weight: 500;">
                    ${text}
                </div>
            </div>
        </div>
    `;

    // Console Logging
    console.log(`%c[${cfg.label}] ${text}`, `color: ${cfg.color}; font-weight: bold; font-size: 14px;`);
};

const removeBanner = (win) => {
    const doc = getBannerDoc(win);
    const banner = doc.getElementById('cto-visual-logger');
    if (banner) banner.remove();
};

const highlightElement = (el, color) => {
    if (!el) return;
    el.style.outline = `8px solid ${color}`;
    el.style.outlineOffset = '-4px';
    el.style.transition = 'outline 0.3s ease-in-out';
    el.style.zIndex = '999999';
    el.style.boxShadow = `0 0 30px ${color}`;
};

/**
 * UTILITIES
 */
const getCleanDomSnapshot = () => {
    const elements = document.body.querySelectorAll('a, button, input');
    return Array.from(elements).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        text: el.innerText?.trim().substring(0, 30) || undefined,
        className: el.className || undefined
    }));
};

const getElement = (selector) => {
    const isXPath = selector.startsWith('//') || selector.startsWith('(/');
    if (isXPath) {
        return cy.document({ log: false }).then(doc => {
            const result = doc.evaluate(selector, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const el = result.singleNodeValue;
            if (!el) return null;
            return Cypress.$(el);
        });
    }
    const $el = Cypress.$(selector);
    return cy.wrap($el.length > 0 ? $el : null, { log: false });
};

/**
 * CORE ORCHESTRATOR
 */
const orchestrate = (config) => {
    const { locator, intent, action, value } = config;
    let retryCount = 0;
    const maxRetries = 2;

    return cy.window({ log: false }).then(win => {
        updateBanner(win, `Initiating search for: ${intent}`, 'info');

        const attempt = () => {
            return getElement(locator).then($el => {
                if ($el && $el.length > 0) {
                    updateBanner(win, `Element Found Successfully!`, 'info');
                    highlightElement($el[0], '#00AAFF');
                    return cy.wait(1500).then(() => {
                        removeBanner(win);
                        return action($el, value);
                    });
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    updateBanner(win, `Cannot find ${intent}. Retrying (${retryCount}/${maxRetries})...`, 'retry');
                    return cy.wait(2500).then(attempt);
                } else {
                    updateBanner(win, `Original locator failed. Deploying AI Agent...`, 'fail');
                    return cy.wait(2000).then(() => {
                        updateBanner(win, `AI Orchestrator healing missing locator...`, 'heal');
                        const domSnapshot = getCleanDomSnapshot();
                        return cy.task('healSelector', { intent, domSnapshot, originalSelector: locator })
                            .then(({ healedSelector }) => {
                                updateBanner(win, `AI HEALED: Accessing via ${healedSelector}`, 'heal');
                                return getElement(healedSelector).then($healed => {
                                    if (!$healed) throw new Error(`Healed selector failed.`);
                                    highlightElement($healed[0], '#39FF14');
                                    return cy.wait(4000).then(() => {
                                        removeBanner(win);
                                        return action($healed.first(), value);
                                    });
                                });
                            });
                    });
                }
            });
        };
        return attempt();
    });
};

/**
 * COMMANDS
 */
Cypress.Commands.add('resilientFill', (locator, text, intent) => {
    return orchestrate({
        locator, intent, value: text,
        action: ($el, val) => cy.wrap($el).clear().type(val)
    });
});

Cypress.Commands.add('resilientClick', (locator, intent) => {
    return orchestrate({
        locator, intent,
        action: ($el) => cy.wrap($el).scrollIntoView().click({ force: true })
    });
});

Cypress.Commands.add('healGet', (selector, options = {}) => {
    return orchestrate({
        locator: selector, intent: options.label || 'Target Element',
        action: ($el) => cy.wrap($el)
    });
});

Cypress.Commands.add('healClick', (selector, options = {}) => {
    return cy.healGet(selector, options).scrollIntoView().click({ force: true });
});

Cypress.Commands.add('resetHealingLog', () => {
    cy.window({ log: false }).then(win => removeBanner(win));
});

Cypress.Commands.add('printHealingReport', () => {
    cy.log('✅ Healing session complete');
});
