import { Injectable } from "@nestjs/common";
import { CatalogRepository, type Restaurant } from "./catalog.repository.js";

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  list(
    limit = 20,
    offset = 0,
  ): { data: Restaurant[]; limit: number; offset: number; total: number } {
    const res = this.repository.findAll(limit, offset);
    return {
      data: res.data,
      limit,
      offset,
      total: res.total,
    };
  }

  restaurantExists(id: number): boolean {
    return this.repository.exists(id);
  }
}
