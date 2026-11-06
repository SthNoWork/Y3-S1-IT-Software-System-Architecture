# WEEK 4 · PRACTICE SESSION · 2 HOURS · TEAMS OF 3–4
## Build a REST API with NestJS and call it from Vue

- **Mode:** Computer
- **Portfolio item:** API specification + API code
- **Goal:** Design FoodHub's first API properly (methods, status codes, validation, idempotency), then call it from a Vue page and see CORS and cookies in action.

---

## Part A — Create the NestJS API (25 min)

### 1. Project Setup
Create the project and install required dependencies:

```bash
npx @nestjs/cli new foodhub-api --package-manager npm
cd foodhub-api
npm install class-validator class-transformer cookie-parser
npm install -D @types/cookie-parser
```

Delete `src/app.controller.ts`, `src/app.service.ts`, and `src/app.controller.spec.ts`.

---

### 2. In-Memory Data Store (`src/data.ts`)
Set up in-memory data for now (Week 10 moves it to a database):

```typescript
export interface Restaurant {
  id: number;
  name: string;
  area: string;
}

export interface Order {
  id: string;
  restaurantId: number;
  items: string[];
  status: string;
}

export const RESTAURANTS: Restaurant[] = [
  { id: 1, name: 'Num Banh Chok Corner', area: 'Daun Penh' },
  { id: 2, name: 'Lok Lak House', area: 'BKK1' },
  { id: 3, name: 'Amok Garden', area: 'Toul Kork' },
];

export const ORDERS = new Map<string, Order>();        // order id -> order
export const IDEMPOTENCY = new Map<string, string>();  // idempotency key -> order id
export const SESSIONS = new Map<string, string>();     // session id -> username
```

---

### 3. Restaurants Controller (`src/restaurants.controller.ts`)

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { RESTAURANTS } from './data.js';

@Controller('v1/restaurants')
export class RestaurantsController {
  @Get()
  list(@Query('limit') limit = '20', @Query('offset') offset = '0') {
    const l = Number(limit);
    const o = Number(offset);
    return {
      data: RESTAURANTS.slice(o, o + l),
      limit: l,
      offset: o,
      total: RESTAURANTS.length,
    };
  }
}
```

---

### 4. Orders Controller (`src/orders.controller.ts`)
The DTO class validates the incoming request body:

```typescript
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ArrayNotEmpty, IsInt, IsString } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { IDEMPOTENCY, ORDERS, RESTAURANTS } from './data.js';

export class CreateOrderDto {
  @IsInt()
  restaurantId: number;

  @ArrayNotEmpty()
  @IsString({ each: true })
  items: string[];
}

@Controller('v1/orders')
export class OrdersController {
  @Post()
  @HttpCode(201)
  create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') key: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (key && IDEMPOTENCY.has(key)) {
      res.status(200); // same request again: return the first result
      return ORDERS.get(IDEMPOTENCY.get(key)!);
    }

    if (!RESTAURANTS.some((r) => r.id === dto.restaurantId)) {
      throw new NotFoundException('restaurant not found');
    }

    const order = { id: randomUUID(), status: 'PLACED', ...dto };
    ORDERS.set(order.id, order);

    if (key) {
      IDEMPOTENCY.set(key, order.id);
    }

    return order;
  }
}
```

---

### 5. Authentication Controller (`src/auth.controller.ts`)
A simple cookie session implementation (Week 14 replaces it with full login):

```typescript
import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { SESSIONS } from './data.js';

@Controller('v1')
export class AuthController {
  @Post('login')
  login(
    @Query('username') username: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sid = randomBytes(32).toString('base64url');
    SESSIONS.set(sid, username);
    res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' }); // add secure: true behind HTTPS
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: Request) {
    const username = SESSIONS.get(req.cookies?.sid);
    if (!username) throw new UnauthorizedException('not logged in');
    return { username };
  }
}
```

---

### 6. App Configuration (`src/app.module.ts` and `src/main.ts`)

Replace `src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller.js';
import { OrdersController } from './orders.controller.js';
import { AuthController } from './auth.controller.js';

@Module({
  controllers: [RestaurantsController, OrdersController, AuthController],
})
export class AppModule {}
```

Replace `src/main.ts`:
```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

---

### 7. Initial Testing
Start the server and test with `curl`:

```bash
npm run start:dev
```

```bash
curl "localhost:3000/v1/restaurants?limit=2"
curl -X POST localhost:3000/v1/orders -H 'content-type: application/json' -d '{"restaurantId":1,"items":["amok"]}'
curl -X POST localhost:3000/v1/orders -H 'content-type: application/json' -d '{"restaurantId":"a","items":[]}' # 400
```

---

## Part B — Complete the API (35 min)

1. **Add Order Endpoints:**
   - `GET /v1/orders/:id` (returns `404` if missing).
   - `PATCH /v1/orders/:id` (changes status).
   - **Allowed status transitions:**
     - `PLACED` $\rightarrow$ `COOKING` $\rightarrow$ `DELIVERING` $\rightarrow$ `DELIVERED`
     - `PLACED` $\rightarrow$ `CANCELLED`
     - Throw `ConflictException` (`409`) for any other transition.
   - Validate the body using a DTO with `@IsIn([...])`.

2. **Test Idempotency:**
   - Send the same `POST /v1/orders` request twice with header `Idempotency-Key: abc-123`.
   - The first request returns `201`, the second returns `200` with the exact same order.
   - Explain in one sentence why a mobile app on an unreliable network requires this.

3. **API Specification:**
   - Complete the API specification table in the portfolio (method, path, request body, success code, error codes).

---

## Part C — A Vue Client and CORS (30 min)

### 1. Scaffold Vue Frontend
In a new terminal, alongside `foodhub-api`:

```bash
npm create vite@latest foodhub-web -- --template vue-ts
cd foodhub-web && npm install
```

### 2. Replace `src/App.vue`

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const API = 'http://localhost:3000';
const restaurants = ref<{ id: number; name: string; area: string }[]>([]);
const message = ref('');

async function loadRestaurants() {
  try {
    const res = await fetch(`${API}/v1/restaurants`);
    restaurants.value = (await res.json()).data;
  } catch (e) {
    message.value = `Blocked: ${e}`; // a CORS error shows up here as "Failed to fetch"
  }
}

async function login() {
  await fetch(`${API}/v1/login?username=dara`, {
    method: 'POST',
    credentials: 'include',
  });
  message.value = 'Logged in';
}

async function whoAmI() {
  const res = await fetch(`${API}/v1/me`, {
    credentials: 'include', // send the cookie
  });
  message.value = JSON.stringify(await res.json());
}

onMounted(loadRestaurants);
</script>

<template>
  <h1>FoodHub</h1>
  <ul>
    <li v-for="r in restaurants" :key="r.id">
      {{ r.name }} ({{ r.area }})
    </li>
  </ul>
  <button @click="login">Log in as dara</button>
  <button @click="whoAmI">Who am I?</button>
  <p>{{ message }}</p>
</template>
```

### 3. Run and Observe CORS Failure
Run `npm run dev` and open `http://localhost:5173`.
- Notice the list is empty and displays "Blocked".
- Open DevTools Console and observe the CORS error.
- Why does `curl` work fine while the web browser refuses?

### 4. Enable CORS
Fix this in `src/main.ts` of the API before `app.listen`:

```typescript
app.enableCors({ origin: 'http://localhost:5173', credentials: true });
```

Reload the Vue page; the restaurant list should now populate.

### 5. Security Concept
Explain why specifying `origin: '*'` alongside credentials (`credentials: true`) is disallowed and insecure.

---

## Part D — Sessions and Cookies (15 min)

1. Click **Log in as dara**, then **Who am I?**.
   - Check DevTools $\rightarrow$ **Application** $\rightarrow$ **Cookies** $\rightarrow$ `http://localhost:3000`.
   - Inspect the `HttpOnly` and `SameSite` flags on the `sid` cookie.
2. In DevTools Console, evaluate `document.cookie`. Why does `sid` not appear?
3. Restart the API server and click **Who am I?** again.
   - What happens and why?
   - What would happen with 3 API servers behind a load balancer? (Covered further in Week 9.)

---

## Stretch Goal
Compare the payload size of an order encoded as JSON versus MessagePack:
```bash
npm install @msgpack/msgpack
```
Compare `encode(order).length` with `JSON.stringify(order).length`.

---

## Before You Leave: Checklist

- [ ] All endpoints work with appropriate `201`, `200`, `400`, `404`, and `409` status codes.
- [ ] Idempotency key successfully prevents duplicate orders.
- [ ] CORS error reproduced in Vue application and resolved.
- [ ] Cookie flags, `document.cookie`, and server restart questions answered.
- [ ] API specification table completed in the portfolio; code committed and pushed to team repository.

---

## Record Your Results

### Part A–B — Test Results

| Request | Status Code | Notes |
| :--- | :--- | :--- |
| `GET /v1/restaurants?limit=2` | | |
| `POST /v1/orders` (valid) | | |
| `POST /v1/orders` (restaurantId "a", items []) | | |
| `POST /v1/orders`, restaurant 99 | | |
| `GET /v1/orders/{id}` (exists / missing) | | |
| `PATCH PLACED → COOKING` | | |
| `PATCH PLACED → DELIVERED` | | |
| `POST` with `Idempotency-Key: abc-123` (1st / 2nd) | | |

**Why does a mobile app on a bad network need an idempotency key? (one sentence):**
> 

---

### API Specification (Portfolio)

| Method | Path | Request Body | Success | Error Codes |
| :--- | :--- | :--- | :--- | :--- |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

---

### Part C — CORS

| Question | Answer |
| :--- | :--- |
| CORS error message in the console | |
| Why curl works but the browser refuses | |
| Why `origin: '*'` with credentials is a bad idea | |

---

### Part D — Cookies

| Question | Answer |
| :--- | :--- |
| Flags on the `sid` cookie | |
| Why `document.cookie` does not show `sid` | |
| What happens after an API restart, and why | |
| What would happen with 3 API servers behind a load balancer | |