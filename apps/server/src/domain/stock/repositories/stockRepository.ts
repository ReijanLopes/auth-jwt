import { Stock } from "../entities/stock";

export interface StockRepository {
  save(stock: Stock): Promise<Stock>;
  findById(id: string): Promise<Stock | null>;
  findByDepartmentId(departmentId: string): Promise<Stock[]>;
}
