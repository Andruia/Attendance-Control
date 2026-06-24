// Custom Cypress commands

// Type augmentation for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(pin: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", (pin: string) => {
  cy.intercept("POST", "/api/auth/verify-pin").as("login");
  cy.visit("/clock");
  cy.get("input[type='password']").type(pin);
  cy.contains("Verify PIN").click();
  cy.wait("@login");
});

export {};
