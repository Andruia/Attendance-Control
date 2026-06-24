describe("Clock In Flow", () => {
  beforeEach(() => {
    cy.visit("/clock");
  });

  it("shows PIN entry screen", () => {
    cy.get("input[type='password']").should("be.visible");
    cy.contains("Clock In").should("be.visible");
  });

  it("shows error for invalid PIN format", () => {
    cy.get("input[type='password']").type("12");
    cy.contains("Verify PIN").click();
    cy.contains("PIN must be 4-6 digits").should("not.exist"); // Button disabled for short PIN
    cy.get("button").contains("Verify PIN").should("be.disabled");
  });

  it("attempts PIN verification and shows error on failure", () => {
    cy.intercept("POST", "/api/auth/verify-pin", {
      statusCode: 401,
      body: { error: "Invalid PIN" },
    }).as("verifyPin");

    cy.get("input[type='password']").type("1234");
    cy.contains("Verify PIN").click();
    cy.wait("@verifyPin");
    cy.contains("Invalid PIN").should("be.visible");
  });
});

describe("Offline Sync", () => {
  it("shows offline badge when offline", () => {
    cy.visit("/clock");
    cy.window().then((win) => {
      cy.stub(win.navigator, "onLine").value(false);
      win.dispatchEvent(new Event("offline"));
    });
    cy.contains("Offline").should("be.visible");
  });
});

describe("Export Flow", () => {
  it("shows export buttons on reports page", () => {
    cy.visit("/reports");
    cy.contains("Export CSV").should("be.visible");
    cy.contains("Export Excel").should("be.visible");
    cy.contains("Export PDF").should("be.visible");
  });
});
