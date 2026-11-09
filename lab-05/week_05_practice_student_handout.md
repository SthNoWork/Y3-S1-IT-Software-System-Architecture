# WEEK 5 · PRACTICE SESSION · 2 HOURS · TEAMS OF 3–4

## Modular Monolith with NestJS Modules

- **Mode:** Paper (40 min) + Computer (65 min)
- **Portfolio item:** Module map + ADR-002
- **Goal:** Give the FoodHub backend a clear internal structure with NestJS modules and ports/adapters.

---

## Part A — Module Map on Paper (40 min)

1. Split FoodHub's backend into 4–6 modules (for example: `catalog`, `ordering`, `payment`, `delivery`, `notification`, `identity`).
2. For each module, identify:
   - Its responsibility (one concise sentence)
   - The data it owns
   - The operations it exposes to other modules
3. Draw architectural dependency arrows indicating module interactions.
   - **Rule: No cyclic dependencies.**
   - If a cycle is identified (e.g., `ordering` $\leftrightarrow$ `payment`), decouple it and document the resolution (events, callbacks, or shifting responsibilities).

---

## Part B — Restructure the Code (50 min)

### 1. Module-by-Feature Directory Structure

Reorganize the Week 4 codebase into one NestJS module per domain area:

```text
src/
├── catalog/
│   ├── catalog.module.ts
│   ├── catalog.controller.ts
│   ├── catalog.service.ts
│   └── catalog.repository.ts
├── ordering/
│   ├── ordering.module.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── order.repository.ts
│   └── in-memory-order.repository.ts
├── auth.controller.ts
├── app.module.ts
└── main.ts
```

> **Note:** Controllers must only handle HTTP routing and transport concerns. Business rules (such as idempotency and valid status lifecycle transitions) belong in the services.

---

### 2. Catalog Module Encapsulation (`src/catalog/catalog.module.ts`)

The `catalog` module exports its service for other modules to consume, while keeping its repository strictly private:

```typescript
import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller.js";
import { CatalogRepository } from "./catalog.repository.js";
import { CatalogService } from "./catalog.service.js";

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
  exports: [CatalogService], // other modules may use the service, not the repository
})
export class CatalogModule {}
```

Provide `CatalogService` with a method: `restaurantExists(id: number): boolean`.

---

### 3. Ports & Adapters in Ordering Module

Define the **Port** (`src/ordering/order.repository.ts`) with no technology-specific code:

```typescript
// The PORT: what the ordering logic needs from storage, with no technology in it.
export interface Order {
  id: string;
  restaurantId: number;
  items: string[];
  status: string;
}

export interface OrderRepository {
  save(order: Order): Promise<void>;
  get(id: string): Promise<Order | undefined>;
}

export const ORDER_REPOSITORY = Symbol("ORDER_REPOSITORY");
```

Define the **Adapter** (`src/ordering/in-memory-order.repository.ts`) that implements the port:

```typescript
// An ADAPTER: one way to implement the port. Week 10 adds a PostgreSQL adapter.
import { Injectable } from "@nestjs/common";
import type { Order, OrderRepository } from "./order.repository.js";

@Injectable()
export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async get(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }
}
```

---

### 4. Injecting the Port into Service (`src/ordering/orders.service.ts`)

`OrdersService` depends strictly on the port interface via its injection token, never on concrete storage implementations:

```typescript
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CatalogService } from "../catalog/catalog.service.js";
import { ORDER_REPOSITORY } from "./order.repository.js";
import type { Order, OrderRepository } from "./order.repository.js";

const ALLOWED: Record<string, string[]> = {
  PLACED: ["COOKING", "CANCELLED"],
  COOKING: ["DELIVERING"],
  DELIVERING: ["DELIVERED"],
};

@Injectable()
export class OrdersService {
  private readonly idempotency = new Map<string, string>();

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly catalog: CatalogService,
  ) {}

  async changeStatus(id: string, status: string): Promise<Order> {
    const order = await this.get(id);
    if (!(ALLOWED[order.status] ?? []).includes(status)) {
      throw new ConflictException(
        `cannot go from ${order.status} to ${status}`,
      );
    }
    order.status = status;
    await this.orders.save(order);
    return order;
  }

  // TODO: place(restaurantId, items, key?) and get(id), moved from the week 4 controller
}
```

> **Note:** `import type` is required for interfaces injected into constructors, as TypeScript elides interface symbols at runtime.

---

### 5. Wiring Port to Adapter (`src/ordering/ordering.module.ts`)

This module definition is the sole location aware of the concrete storage binding:

```typescript
import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module.js";
import { InMemoryOrderRepository } from "./in-memory-order.repository.js";
import { ORDER_REPOSITORY } from "./order.repository.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  imports: [CatalogModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository },
  ],
})
export class OrderingModule {}
```

`AppModule` should now import `CatalogModule` and `OrderingModule` directly instead of listing raw controllers.

---

### 6. Dependency Boundary Check

Verify that the ordering module does not access the catalog repository:

```bash
grep -rn "catalog.repository" src/ordering && echo "RULE BROKEN" || echo "OK"
```

**Deliberately break the boundary:**

- Attempt to inject `CatalogRepository` directly into `OrdersService`.
- Verify that NestJS refuses to start.
- Inspect the error: verify how NestJS enforces boundary encapsulation because `CatalogRepository` is omitted from `exports`.

---

## Part C — ADR-002 (15 min)

Write **ADR-002: Internal structure of the FoodHub backend (layered vs modular vs hexagonal)** covering:

- **Context**
- **Decision**
- **Consequences**

---

## Before You Leave: Checklist

- [x] Module map completed with responsibilities, owned data, and acyclic dependencies.
- [x] Code reorganised into modular NestJS packages; `OrdersService` depends on the repository port.
- [x] All Week 4 endpoints remain fully functional; dependency check passes; rule-breaking failure analyzed.
- [x] ADR-002 completed and documented.

---

## Record Your Results

### Part A — Module Map

| Module         | Responsibility (one sentence)                                                                | Data it owns                                                                   | Operations it offers                                                                                  |
| :------------- | :------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `catalog`      | Manages restaurant profiles, menus, dish pricing, and store availability.                    | Restaurants, menus, categories, menu items, operating schedules.               | `listRestaurants(limit, offset)`, `restaurantExists(id)`, `getMenuItems(restaurantId)`.               |
| `ordering`     | Coordinates order placement, state lifecycle progression, and idempotency protection.        | Orders, order items, status lifecycle history, idempotency keys.               | `place(restaurantId, items, key?)`, `get(id)`, `changeStatus(id, status)`.                            |
| `payment`      | Authorizes and captures payments and manages refunds through financial gateways.             | Transactions, payment methods, receipts, refund audit logs.                    | `processPayment(orderId, amount, method)`, `refundPayment(txnId)`, `getPaymentStatus(orderId)`.       |
| `delivery`     | Manages courier assignment, real-time geolocation tracking, and fulfillment delivery routes. | Dispatches, driver assignments, delivery addresses, live coordinate waypoints. | `scheduleDelivery(orderId, address)`, `assignDriver(deliveryId)`, `updateLocation(driverId, coords)`. |
| `notification` | Formats and dispatches transactional alerts across push, SMS, and email channels.            | Notification templates, user messaging preferences, delivery logs.             | `sendAlert(userId, channel, message)`, `notifyStatusChange(orderId, status)`.                         |
| `identity`     | Handles user authentication, session cookies, driver/restaurant roles, and access controls.  | User credentials, profiles, sessions, role permissions.                        | `login(username, password)`, `validateSession(sid)`, `getUserProfile(userId)`.                        |

#### Call Graph & Cycle Breaking

_Draw or write the interaction flow (`Module A -> Module B`). If any cycle was detected, note how it was resolved:_

```text
Synchronous Dependency Flow:
Ordering Module ----(CatalogService.restaurantExists)----> Catalog Module
Ordering Module ----(IdentityService.validateSession)----> Identity Module
Delivery Module ----(IdentityService.getDriverProfile)---> Identity Module

Cycle Detection (Ordering <-> Payment):
- Direct bidirectional coupling: Ordering calls Payment to capture payment, while Payment calls Ordering to update order status upon receiving asynchronous webhook confirmations.
- Resolution via Domain Events (Decoupling):
  1. Ordering module transitions order to PENDING_PAYMENT and emits domain event: OrderPlacedEvent(orderId, amount).
  2. Payment module subscribes to OrderPlacedEvent, processes transaction, and publishes PaymentCompletedEvent(orderId, paymentId).
  3. Ordering module subscribes to PaymentCompletedEvent and transitions order status to COOKING.
  4. Delivery and Notification modules consume downstream events independently.
- Result: Call graph forms a strict Directed Acyclic Graph (DAG) with zero cyclic dependencies.
```

---

### Part B — Checks

| Check                                                                   | Result                                                                                                                                                                                                                                                                                                                                                                                                  |
| :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All Week 4 endpoints still work (list which you tested)                 | Passed: `GET /v1/restaurants?limit=2` (200), `POST /v1/orders` (201), `POST /v1/orders` invalid DTO (400), `POST /v1/orders` invalid restaurant ID 99 (404), `GET /v1/orders/:id` exists (200) / missing (404), `PATCH /v1/orders/:id` PLACED -> COOKING (200) / COOKING -> DELIVERED (409), `POST /v1/orders` with idempotency key (201 then 200 repeat), `POST /v1/login` (201) & `GET /v1/me` (200). |
| Output of the `grep` dependency check                                   | `OK` (0 occurrences of `catalog.repository` across `src/ordering/`).                                                                                                                                                                                                                                                                                                                                    |
| Error message when `CatalogRepository` is injected into `OrdersService` | `ERROR [ExceptionHandler] UnknownDependenciesException [Error]: Nest can't resolve dependencies of the OrdersService (Symbol(ORDER_REPOSITORY), CatalogService, ?). Please make sure that the argument CatalogRepository at index [2] is available in the OrderingModule module.`                                                                                                                       |
| Why does Nest refuse to start?                                          | NestJS strictly enforces module encapsulation boundaries. Providers declared in `CatalogModule` are private by default. Because `CatalogRepository` was not exported in `CatalogModule`'s `exports` array, NestJS's dependency injection container refuses to resolve or inject it into another module (`OrderingModule`), catching illegal cross-boundary coupling at boot time.                       |

---

### Part C — ADR-002

| Section          | Your text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :--------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**        | ADR-002: Modular Monolith Architecture with Ports and Adapters for FoodHub Backend                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Status**       | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Context**      | FoodHub's initial prototype relied on flat controllers and global in-memory data structures. As the application expands across ordering, catalog, delivery, and payments, a monolithic layered architecture without modular boundaries risks "spaghetti code", high coupling, and circular dependencies. Microservices would solve team autonomy but introduce excessive operational complexity, distributed transaction overhead, and network latency premature for our current scale.                                                                                                                                                                                                                                                                                                                                                          |
| **Decision**     | Structure the backend as a Modular Monolith with Ports and Adapters (Hexagonal Architecture) using NestJS modules:<br>1. **Domain Feature Modules:** Group codebase into high-cohesion domain modules (`catalog`, `ordering`, etc.). Each module encapsulates its internal database representations and repositories.<br>2. **Strict Encapsulation:** Repositories remain private to their owning module. Inter-module communication occurs strictly via exported facade services or asynchronous domain events.<br>3. **Ports and Adapters:** Business services (such as `OrdersService`) depend strictly on domain port interfaces (`OrderRepository` via NestJS `Symbol` tokens), completely decoupling domain business logic from the underlying storage mechanism (`InMemoryOrderRepository` now, relational database in later iterations). |
| **Consequences** | **Positive:** Clear architectural boundaries with compile-time and boot-time DI enforcement; trivial migration to external databases (e.g., PostgreSQL) by writing new adapters without touching domain logic; high testability with mock adapters; zero distributed systems operational burden.<br>**Negative:** Slight boilerplate increase (interfaces, provider tokens, and module wiring); requires developer discipline to prevent bypasses of the port/adapter pattern.                                                                                                                                                                                                                                                                                                                                                                   |
