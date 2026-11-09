import {
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ArrayNotEmpty, IsIn, IsInt, IsString } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { IDEMPOTENCY, ORDERS, RESTAURANTS, type Order } from './data.js';

export class CreateOrderDto {
  @IsInt()
  restaurantId: number;

  @ArrayNotEmpty()
  @IsString({ each: true })
  items: string[];
}

export const VALID_STATUSES = [
  'PLACED',
  'COOKING',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof VALID_STATUSES)[number];

export class UpdateOrderStatusDto {
  @IsIn(VALID_STATUSES)
  status: OrderStatus;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PLACED: ['COOKING', 'CANCELLED'],
  COOKING: ['DELIVERING'],
  DELIVERING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

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

    const order: Order = { id: randomUUID(), status: 'PLACED', ...dto };
    ORDERS.set(order.id, order);

    if (key) {
      IDEMPOTENCY.set(key, order.id);
    }

    return order;
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    const order = ORDERS.get(id);
    if (!order) {
      throw new NotFoundException('order not found');
    }
    return order;
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    const order = ORDERS.get(id);
    if (!order) {
      throw new NotFoundException('order not found');
    }

    const nextAllowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!nextAllowed.includes(dto.status)) {
      throw new ConflictException(
        `Cannot transition order status from ${order.status} to ${dto.status}`,
      );
    }

    order.status = dto.status;
    ORDERS.set(order.id, order);
    return order;
  }
}

