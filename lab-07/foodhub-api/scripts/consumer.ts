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

const processed = new Set<string>();

await ch.consume(queue, (msg) => {
  if (!msg) return;
  const event = JSON.parse(msg.content.toString());

  if (!Array.isArray(event.items) || event.items.length === 0) {
    console.log(`[${queue}] bad message ${event.eventId}, sending to DLQ`);
    ch.nack(msg, false, false);
    return;
  }

  if (processed.has(event.eventId)) {
    console.log(`[${queue}] skip duplicate ${event.eventId}`);
    ch.ack(msg);
    return;
  }

  console.log(`[${queue}] got ${event.type} ${event.eventId}`);
  processed.add(event.eventId);
  ch.ack(msg);
});
console.log(`[${queue}] waiting for events...`);
