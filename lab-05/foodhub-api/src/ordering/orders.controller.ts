import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ArrayNotEmpty, IsIn, IsInt, IsString } from 'class-validator';
import { OrdersService } from './orders.service.js';

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

@Controller('v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') key: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.ordersService.place(dto.restaurantId, dto.items, key);
    if (result.isRepeat) {
      res.status(200);
    } else {
      res.status(201);
    }
    return result.order;
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.ordersService.get(id);
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.changeStatus(id, dto.status);
  }
}
