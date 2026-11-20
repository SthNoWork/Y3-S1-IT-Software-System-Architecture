# Week 04 & Week 05 Quiz Answers

---

## Week 04: Web Concepts and API Design

### Part A — Multiple Choice

1. **Which cookie flag stops JavaScript on the page from reading the session cookie?**
   - **Answer:** **B. HttpOnly**
   - **Explanation:** `HttpOnly` hides the cookie from `document.cookie`, mitigating Cross-Site Scripting (XSS) session theft.

2. **What is the main weakness of a self-contained JWT compared with a server-side session?**
   - **Answer:** **C. It is hard to revoke before it expires**
   - **Explanation:** Any server verifying the signature will accept the JWT until its expiration time (`exp`). Revocation requires workarounds like short lifetimes with refresh tokens or centralized denylists.

3. **A JWT payload is:**
   - **Answer:** **B. Signed, so it cannot be changed without detection, but anyone can read it**
   - **Explanation:** JWTs are Base64URL-encoded and signed (ensuring integrity and tamper detection), not encrypted. Sensitive secrets should never be placed in the payload.

4. **A client creates a new order. Which request and success code are correct?**
   - **Answer:** **B. POST /v1/orders → 201**
   - **Explanation:** Resource creation in REST uses `POST` to the collection endpoint and returns `201 Created`.

5. **The client sends `{"restaurantId": "abc"}` where a number is required. Which status code fits?**
   - **Answer:** **B. 400**
   - **Explanation:** Client-side validation errors and malformed payloads return `400 Bad Request`.

6. **Which HTTP method is not idempotent?**
   - **Answer:** **D. POST**
   - **Explanation:** Repeating identical `POST` requests creates multiple resources or side-effects, unlike `GET`, `PUT`, and `DELETE`.

7. **A payment provider must tell FoodHub the moment a payment succeeds. Which style fits best?**
   - **Answer:** **B. A webhook: the provider sends an HTTP POST to FoodHub**
   - **Explanation:** Webhooks push real-time event notifications from provider to consumer, avoiding the latency and resource waste of polling.

8. **Which task does not belong in an API gateway?**
   - **Answer:** **D. Calculating the delivery fee for an order**
   - **Explanation:** API gateways handle cross-cutting technical concerns (routing, rate limiting, auth token validation). Domain and business logic belong inside backend domain services.

9. **Which statement about CORS is correct?**
   - **Answer:** **B. It is enforced by browsers, which only give a cross-origin response to the page if the server allows that origin**
   - **Explanation:** CORS is a browser-enforced security mechanism designed to protect users from malicious scripts making unauthorized cross-origin requests; non-browser clients (such as `curl`) do not enforce it.

10. **Why are Protobuf and Avro good for long-lived event data?**
    - **Answer:** **B. They support schema evolution, so fields can be added without breaking old readers**
    - **Explanation:** Both binary serialization formats enforce structured schemas and support backward/forward compatibility rules as schemas change over time.

---

### Part B — Short Answer

#### Question 11 (4 points)

**Design three REST endpoints for FoodHub restaurant reviews (list a restaurant's reviews, add a review, delete your own review). For each give the method, path, success code and one error code.**

- **List reviews for a restaurant:**
  - **Method & Path:** `GET /v1/restaurants/{id}/reviews?limit=20&offset=0`
  - **Success Code:** `200 OK`
  - **Error Code:** `404 Not Found` (restaurant does not exist)
- **Add a review:**
  - **Method & Path:** `POST /v1/restaurants/{id}/reviews`
  - **Success Code:** `201 Created`
  - **Error Code:** `400 Bad Request` (invalid rating/content), `401 Unauthorized` (unauthenticated user), or `409 Conflict` (user already submitted a review)
- **Delete your own review:**
  - **Method & Path:** `DELETE /v1/reviews/{reviewId}`
  - **Success Code:** `204 No Content`
  - **Error Code:** `403 Forbidden` (user is not the author of the review) or `404 Not Found` (review does not exist)

---

#### Question 12 (3 points)

**A customer taps "Order" on a slow network. The order is created but the response never arrives, and the app retries. What goes wrong without protection, and how does an idempotency key fix it?**

- **The Problem:** Without protection, duplicate `POST` requests create multiple separate orders in the system, potentially resulting in the customer being charged multiple times.
- **Client Mechanism:** The client generates a unique UUID / token for the transaction attempt and sends it in an `Idempotency-Key` HTTP header, resending the identical key upon retries.
- **Server Mechanism:** The server stores the idempotency key along with the operation result. When a duplicate request with an existing key is received, the server skips re-executing order creation and returns the previously saved response (e.g., `201 Created` or `200 OK` with the original order).

---

#### Question 13 (3 points)

**A Vue app on `http://localhost:5173` calls an API on `http://localhost:3000` and gets "blocked by CORS policy", but the same request works with `curl`. Explain why, and give the fix on the server.**

- **Why it happens:** The origin of the web client (`http://localhost:5173`) differs in port from the API server (`http://localhost:3000`), triggering the browser's Same-Origin Policy. Browsers enforce CORS and block client script access to the response unless the server explicitly permits the origin. Command-line tools like `curl` are not web browsers and do not enforce Same-Origin or CORS rules.
- **Server Fix:** The backend server must return CORS headers allowing the frontend origin:

  ```http
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Credentials: true
  ```

  In NestJS, configure CORS in `main.ts`:

  ```typescript
  app.enableCors({
    origin: "http://localhost:5173",
    credentials: true,
  });
  ```

  _(Note: Wildcard `_` cannot be used when credentials/cookies are included).\*

---

---

## Week 05: Monolith, Layered and Modular Styles

### Part A — Multiple Choice

1. **Which is a real strength of a monolith?**
   - **Answer:** **B. Calls between parts are in-process function calls, and one database makes transactions simple**
   - **Explanation:** In-process communication has minimal overhead and latency, and a single database enables straightforward ACID transactions.

2. **In a strict layered architecture, the presentation layer may call:**
   - **Answer:** **A. Only the layer directly below it**
   - **Explanation:** In strict layering, each layer may only access the layer directly underneath it (e.g., Presentation → Business Logic / Service layer).

3. **A Vue app, a NestJS API and a PostgreSQL database each run separately. This is:**
   - **Answer:** **C. A 3-tier system**
   - **Explanation:** Three distinct physical tiers run across independent processes/machines: the presentation tier (client app), application logic tier (API server), and data tier (database).

4. **What is the main idea of a modular monolith?**
   - **Answer:** **B. One deployable split into modules by business area, each owning its data and exposing a public interface**
   - **Explanation:** A modular monolith maintains a single deployable artifact while enforcing modular domain boundaries with private internals and clean public interfaces.

5. **In a NestJS modular monolith, how does CatalogModule stop other modules using its repository?**
   - **Answer:** **B. By listing only CatalogService in exports**
   - **Explanation:** Providers not listed in the `exports` array of a NestJS module remain internal/encapsulated and cannot be injected by other modules.

6. **In hexagonal architecture, which way do dependencies point?**
   - **Answer:** **B. From adapters inwards to the core**
   - **Explanation:** Dependency inversion ensures that external adapters (driving and driven) depend inwards on the core business logic and port interfaces.

7. **In hexagonal architecture, OrderRepository (an interface used by the ordering logic) is a:**
   - **Answer:** **B. Port**
   - **Explanation:** An interface defined by the core to interact with an external resource is an outgoing (driven) port. Concrete classes (e.g., `PostgresOrderRepository`) are adapters.

8. **Processing an uploaded photo through scan → resize → compress → store is an example of:**
   - **Answer:** **B. Pipe-and-filter**
   - **Explanation:** Data flows sequentially through discrete, loosely coupled processing stages (filters) connected by conduits (pipes).

9. **An editor where a small core is extended by many independently written extensions follows which style?**
   - **Answer:** **A. Microkernel (plug-in)**
   - **Explanation:** A minimal core engine providing basic runtime facilities extended by dynamic plug-ins (e.g., VS Code, Eclipse).

10. **Ordering calls payment, and payment calls ordering. What is the best advice?**
    - **Answer:** **C. Break the cycle, for example with an event or by moving the responsibility, or treat them as one module**
    - **Explanation:** Circular dependencies indicate flawed architectural boundaries. They should be decoupled using domain events, inverted dependencies, or by merging tightly coupled concepts.

---

### Part B — Short Answer

#### Question 11 (4 points)

**Explain the difference between a logical layer and a physical tier. Give one FoodHub example of each.**

- **Logical Layer:**
  - **Definition:** An architectural division of code organized by responsibility/concern within a single program or codebase.
  - **FoodHub Example:** The internal organization of the NestJS application into Controllers (presentation/HTTP), Services (business domain logic), and Repositories (data access).
- **Physical Tier:**
  - **Definition:** A physically separated, independently deployed and running runtime infrastructure component, usually running on separate hardware, virtual machines, or containers.
  - **FoodHub Example:** The Vue client application (running in the user's browser), the NestJS API server (running in Node.js on a cloud VM/container), and the PostgreSQL database server.

---

#### Question 12 (3 points)

**FoodHub will move order storage from memory to PostgreSQL in week 10. Explain how a port and adapter make this change small. Which file(s) change?**

- **Port Isolation:** The core ordering domain logic (`OrdersService`) depends solely on the abstract `OrderRepository` interface (the driven port), without any direct coupling to memory maps or SQL queries.
- **New Adapter:** A new database adapter (`PostgresOrderRepository`) is created that implements the `OrderRepository` interface.
- **Files Changed:**
  - _New file:_ `postgres-order.repository.ts` (the adapter implementation).
  - _Modified file:_ `ordering.module.ts` (updating the provider binding line, e.g. `provide: OrderRepository, useClass: PostgresOrderRepository`).
  - _Untouched files:_ `OrdersService`, controllers, and domain models require zero modifications.

---

#### Question 13 (3 points)

**A startup with 4 developers is building an online clinic booking system. Recommend a style from this week and justify it with two reasons tied to their context.**

- **Recommended Style:** **Modular Monolith** (or Layered Monolith)
- **Justifications:**
  1. **Team Size & Low Operational Overhead:** With only 4 developers, running multiple microservices introduces excessive deployment, networking, and monitoring complexity. A single deployable codebase allows the small team to move fast without dedicated DevOps overhead.
  2. **Evolving Product Requirements:** In an early-stage startup, domain boundaries for appointments, patient records, and doctor availability are subject to change. Refactoring modules inside a single codebase is significantly faster and less risky than coordinating API changes and migrations across separate services.
  3. **Data Integrity & Transactions:** Clinic appointments and billing require strict ACID consistency (e.g., avoiding double-booking). A monolith backed by a single relational database simplifies transaction management compared to distributed sagas.
