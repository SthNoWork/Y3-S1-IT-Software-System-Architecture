**WEEK 7 · PRACTICE SESSION · 2 HOURS · TEAMS OF 3–4**

# Queue-based order pipeline with RabbitMQ

* **Mode:** Computer
* **Portfolio item:** Event flow diagram + ADR-004
* **Goal:** Decouple order placement from the kitchen and notifications, and handle duplicates and bad messages.

---

## Part A — Start RabbitMQ (10 min)

```bash
docker run -d --name rabbit -p 5672:5672 -p 15672:15672 rabbitmq:4-management
cd foodhub-api
npm install amqplib
npm install -D @types/amqplib tsx
```

Open the management UI at `http://localhost:15672` (`guest` / `guest`).

---

## Part B — Publish from the API, consume in workers (40 min)

1. Add a publisher to the ordering module:

```typescript
// src/ordering/events.publisher.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import amqp from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';
import { randomUUID } from 'node:crypto';

@Injectable()
export class EventsPublisher implements OnModuleInit, OnModuleDestroy {
  private conn: ChannelModel;
  private channel: Channel;

  async onModuleInit() {
    this.conn = await amqp.connect(process.env.RABBIT_URL ?? 'amqp://localhost');
    this.channel = await this.conn.createChannel();
    await this.channel.assertExchange('orders', 'fanout', { durable: true });
  }

  publish(type: string, data: object) {
    const event = { eventId: randomUUID(), type, occurredAt: new Date().toISOString(), ...data };
    this.channel.publish('orders', '', Buffer.from(JSON.stringify(event)),
      { persistent: true, contentType: 'application/json' });
    return event;
  }

  async onModuleDestroy() { await this.conn?.close(); }
}
```

Add `EventsPublisher` to the providers of `OrderingModule`, inject it into `OrdersService`, and at the end of `place()` (after the order is saved) call:

```typescript
this.events.publish('OrderPlaced', { orderId: order.id, restaurantId, items });
```

2. A consumer worker, run outside the API (`scripts/consumer.ts`):

```typescript
// Run one consumer: npx tsx scripts/consumer.ts kitchen   (or: notification)
import amqp from 'amqplib';

const queue = process.argv[2] ?? 'kitchen';
const conn = await amqp.connect('amqp://localhost');
const ch = await conn.createChannel();
await ch.assertExchange('orders', 'fanout', { durable: true });
await ch.assertExchange('orders.dlx', 'fanout', { durable: true });
await ch.assertQueue(`${queue}.dlq`, { durable: true });
await ch.bindQueue(`${queue}.dlq`, 'orders.dlx', '');
await ch.assertQueue(queue, { durable: true, deadLetterExchange: 'orders.dlx' });
await ch.bindQueue(queue, 'orders', '');
await ch.prefetch(1);

const processed = new Set<string>();   // TODO Part C: skip events already processed

await ch.consume(queue, (msg) => {
  if (!msg) return;
  const event = JSON.parse(msg.content.toString());
  console.log(`[${queue}] got ${event.type} ${event.eventId}`);
  ch.ack(msg);
});
console.log(`[${queue}] waiting for events...`);
```

3. A test publisher for sending exact events by hand (`scripts/publish.ts`):

```typescript
// Publish one test event: npx tsx scripts/publish.ts [eventId] [--bad]
import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';

const eventId = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : randomUUID();
const bad = process.argv.includes('--bad');
const conn = await amqp.connect('amqp://localhost');
const ch = await conn.createChannel();
await ch.assertExchange('orders', 'fanout', { durable: true });
const event = { eventId, type: 'OrderPlaced', orderId: randomUUID(), items: bad ? [] : ['amok'] };
ch.publish('orders', '', Buffer.from(JSON.stringify(event)), { persistent: true });
console.log('published', event);
await ch.close();
await conn.close();
```

4. Run `npx tsx scripts/consumer.ts kitchen` and `npx tsx scripts/consumer.ts notification` in two terminals, start the API, and place a few orders with `curl`. Both consumers receive every event: this is **pub/sub**.
5. Stop the kitchen consumer, place 5 orders, start it again. What happened to the events while it was down? Compare with the API calling the kitchen directly over HTTP.
6. Start a second kitchen consumer. Place 10 orders. How are they shared? (This is the **competing-consumers pattern**.)

---

## Part C — Duplicates and idempotency (25 min)

1. Run `npx tsx scripts/publish.ts same-id-1` twice. The kitchen cooks the same order twice.
2. Make the consumer idempotent: if `processed` already has the `eventId`, log `"skip duplicate"` and `ch.ack(msg)` without doing the work; otherwise do the work and add the id.
3. **Discuss:** `processed` disappears on restart. Where should it live in production? *(A database table with a unique key on `eventId`.)*

---

## Part D — Poison messages and the dead-letter queue (20 min)

1. In the consumer, if `event.items` is empty, call `ch.nack(msg, false, false)` (reject, do not requeue) instead of `ch.ack(msg)`.
2. Run `npx tsx scripts/publish.ts --bad`. Find the message in `kitchen.dlq` in the management UI.
3. Why is requeueing (`ch.nack(msg, false, true)`) dangerous for a message that always fails?

---

## Part E — Diagram and ADR (15 min)

1. Draw FoodHub's event flow: which modules publish and consume `OrderPlaced`, `PaymentAuthorised`, `OrderAccepted`, `RiderAssigned`, `OrderDelivered`.
2. Write **ADR-004**: Messaging for FoodHub (RabbitMQ or Kafka, or none yet), mentioning ordering needs (rider GPS vs orders), retention, and delivery guarantee.

---

## Before you leave: checklist

- [ ] Orders placed through the API reach both consumers; Part B question 5 answered
- [ ] Competing consumers demonstrated
- [ ] Idempotent consumer skips duplicates
- [ ] Bad message lands in the DLQ
- [ ] Event flow diagram and ADR-004 in the portfolio

---

## Record your results

### Part B — Pub/sub and competing consumers

| Question | Answer |
| :--- | :--- |
| Do both consumers receive every order? What is this pattern called? | |
| Kitchen consumer stopped, 5 orders placed, then restarted: what happened? | |
| How would this differ if the API called the kitchen directly over HTTP? | |
| Two kitchen consumers, 10 orders: how were they shared? | |

### Part C — Duplicates and idempotency

| Question | Answer |
| :--- | :--- |
| Output when `same-id-1` is published twice (before the fix) | |
| Output after the fix | |
| Where should `processed` live in production, and why? | |

### Part D — Dead-letter queue

| Question | Answer |
| :--- | :--- |
| Did the bad message reach `kitchen.dlq`? (check the management UI) | |
| Why is requeueing a message that always fails dangerous? | |

### Part E — Event flow and ADR-004

Draw the event flow (who publishes and who consumes each event) here or attach it:

<br><br><br><br><br><br><br><br>

| ADR-004 | Your text |
| :--- | :--- |
| **Title** | |
| **Context** | |
| **Decision** | |
| **Consequences** | |