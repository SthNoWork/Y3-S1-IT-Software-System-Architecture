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

