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
export declare const RESTAURANTS: Restaurant[];
export declare const ORDERS: Map<string, Order>;
export declare const IDEMPOTENCY: Map<string, string>;
export declare const SESSIONS: Map<string, string>;
