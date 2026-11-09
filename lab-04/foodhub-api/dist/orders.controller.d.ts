import type { Response } from 'express';
import { type Order } from './data.js';
export declare class CreateOrderDto {
    restaurantId: number;
    items: string[];
}
export declare const VALID_STATUSES: readonly ["PLACED", "COOKING", "DELIVERING", "DELIVERED", "CANCELLED"];
export type OrderStatus = (typeof VALID_STATUSES)[number];
export declare class UpdateOrderStatusDto {
    status: OrderStatus;
}
export declare class OrdersController {
    create(dto: CreateOrderDto, key: string | undefined, res: Response): Order | undefined;
    getById(id: string): Order;
    updateStatus(id: string, dto: UpdateOrderStatusDto): Order;
}
