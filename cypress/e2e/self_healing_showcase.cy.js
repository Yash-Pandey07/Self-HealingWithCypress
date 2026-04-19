import { loginPage } from './pages/LoginPage';

describe('🤖 Agentic AI Self-Healing — Dashboard Showcase', () => {
    const CREDS = { username: 'test@demo.com', password: 'password123' };

    beforeEach(() => {
        // Suppress app errors
        Cypress.on('uncaught:exception', () => false);
        cy.resetHealingLog();
    });

    afterEach(() => {
        cy.printHealingReport();
    });

    it('Scenario: Navigating and Interacting with Dashboard via Broken Locators', () => {
        // 1. Visit and Login (Heals inside Page Object)
        loginPage.visit();
        loginPage.doLogin(CREDS.username, CREDS.password);

        // 2. We should be on the dashboard now.
        cy.url().should('include', '/app/dashboard');

        cy.log('🚀 Authenticated. Now testing dashboard interactions...');

        // 3. Attempt to navigate to "Products" with a broken selector
        cy.healGet('nav a[href="/wrong/url"]', { label: 'Products Nav Link' })
            .should('be.visible')
            .click();

        // 4. Attempt to "Add to Cart" with a broken selector
        cy.log('🛒 Adding first product to cart...');
        cy.healGet('.btn-add-to-cart-missing', { label: 'Add to Cart Button' })
            .first()
            .click();

        // 5. Verify the cart badge (Broken selector)
        cy.wait(2000);
        cy.healGet('#cart-badge-none', { label: 'Cart Badge' })
            .first()
            .should('exist');

        cy.log('✅ Showcase Complete: All broken locators healed by AI Agent!');
    });
});
