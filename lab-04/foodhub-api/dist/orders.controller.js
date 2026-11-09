var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, ConflictException, Controller, Get, Headers, HttpCode, NotFoundException, Param, Patch, Post, Res, } from '@nestjs/common';
import { ArrayNotEmpty, IsIn, IsInt, IsString } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { IDEMPOTENCY, ORDERS, RESTAURANTS } from './data.js';
export class CreateOrderDto {
    restaurantId;
    items;
}
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "restaurantId", void 0);
__decorate([
    ArrayNotEmpty(),
    IsString({ each: true }),
    __metadata("design:type", Array)
], CreateOrderDto.prototype, "items", void 0);
export const VALID_STATUSES = [
    'PLACED',
    'COOKING',
    'DELIVERING',
    'DELIVERED',
    'CANCELLED',
];
export class UpdateOrderStatusDto {
    status;
}
__decorate([
    IsIn(VALID_STATUSES),
    __metadata("design:type", String)
], UpdateOrderStatusDto.prototype, "status", void 0);
const ALLOWED_TRANSITIONS = {
    PLACED: ['COOKING', 'CANCELLED'],
    COOKING: ['DELIVERING'],
    DELIVERING: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
};
let OrdersController = class OrdersController {
    create(dto, key, res) {
        if (key && IDEMPOTENCY.has(key)) {
            res.status(200);
            return ORDERS.get(IDEMPOTENCY.get(key));
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
    getById(id) {
        const order = ORDERS.get(id);
        if (!order) {
            throw new NotFoundException('order not found');
        }
        return order;
    }
    updateStatus(id, dto) {
        const order = ORDERS.get(id);
        if (!order) {
            throw new NotFoundException('order not found');
        }
        const nextAllowed = ALLOWED_TRANSITIONS[order.status] ?? [];
        if (!nextAllowed.includes(dto.status)) {
            throw new ConflictException(`Cannot transition order status from ${order.status} to ${dto.status}`);
        }
        order.status = dto.status;
        ORDERS.set(order.id, order);
        return order;
    }
};
__decorate([
    Post(),
    HttpCode(201),
    __param(0, Body()),
    __param(1, Headers('idempotency-key')),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateOrderDto, Object, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "create", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getById", null);
__decorate([
    Patch(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateOrderStatusDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "updateStatus", null);
OrdersController = __decorate([
    Controller('v1/orders')
], OrdersController);
export { OrdersController };
//# sourceMappingURL=orders.controller.js.map