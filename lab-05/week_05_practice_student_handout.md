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
import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

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

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
```

Define the **Adapter** (`src/ordering/in-memory-order.repository.ts`) that implements the port:

```typescript
// An ADAPTER: one way to implement the port. Week 10 adds a PostgreSQL adapter.
import { Injectable } from '@nestjs/common';
import type { Order, OrderRepository } from './order.repository.js';

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
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CatalogService } from '../catalog/catalog.service.js';
import { ORDER_REPOSITORY } from './order.repository.js';
import type { Order, OrderRepository } from './order.repository.js';

const ALLOWED: Record<string, string[]> = {
  PLACED: ['COOKING', 'CANCELLED'],
  COOKING: ['DELIVERING'],
  DELIVERING: ['DELIVERED'],
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
      throw new ConflictException(`cannot go from ${order.status} to ${status}`);
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
import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InMemoryOrderRepository } from './in-memory-order.repository.js';
import { ORDER_REPOSITORY } from './order.repository.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

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

- [ ] Module map completed with responsibilities, owned data, and acyclic dependencies.
- [ ] Code reorganised into modular NestJS packages; `OrdersService` depends on the repository port.
- [ ] All Week 4 endpoints remain fully functional; dependency check passes; rule-breaking failure analyzed.
- [ ] ADR-002 completed and documented.

---

## Record Your Results

### Part A — Module Map

| Module | Responsibility (one sentence) | Data it owns | Operations it offers |
| :--- | :--- | :--- | :--- |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

#### Call Graph & Cycle Breaking
*Draw or write the interaction flow (`Module A -> Module B`). If any cycle was detected, note how it was resolved:*

```text

```

---

### Part B — Checks

| Check | Result |
| :--- | :--- |
| All Week 4 endpoints still work (list which you tested) | |
| Output of the `grep` dependency check | |
| Error message when `CatalogRepository` is injected into `OrdersService` | |
| Why does Nest refuse to start? | |

---

### Part C — ADR-002

| Section | Your text |
| :--- | :--- |
| **Title** | |
| **Status** | |
| **Context** | |
| **Decision** | |
| **Consequences** | |