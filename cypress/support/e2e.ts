// Cypress E2E support
import "./commands";

Cypress.on("uncaught:exception", () => {
  // Ignore Next.js streaming errors in test
  return false;
});
