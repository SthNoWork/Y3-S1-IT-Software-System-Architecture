export declare class RestaurantsController {
    list(limit?: string, offset?: string): {
        data: import("./data.js").Restaurant[];
        limit: number;
        offset: number;
        total: number;
    };
}
