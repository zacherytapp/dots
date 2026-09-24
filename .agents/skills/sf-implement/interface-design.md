# Interface Design for Testability

Testable design keeps `@IsTest` classes fast and independent of org state:

1. **Accept dependencies, don't create them** — so tests can pass stubs/mocks.

   ```apex
   // Testable
   public OrderResult processOrder(Order ord, PaymentGateway gateway) {}

   // Hard to test
   public OrderResult processOrder(Order ord) {
       PaymentGateway gateway = new StripeGateway();
   }
   ```

   Use dependency injection with `Test.createStub` / `StubProvider` for callouts and gateways.

2. **Return results, don't produce side effects** — no hidden DML.

   ```apex
   // Testable — caller decides when to persist
   public Discount calculateDiscount(Cart cart) {}

   // Hard to test — mutates and commits inside
   public void applyDiscount(Cart cart) {
       cart.Total__c -= discount;
       update cart;
   }
   ```

3. **Keep the surface small** — fewer methods mean fewer tests; fewer params mean simpler setup and less `@TestSetup` data.
