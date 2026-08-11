import { isValidName } from "../../../shared/validators/nameValidator";

export type StockInput = {
  id?: string;
  name: string;
  departmentId: string;
  quantity?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Stock {
  private constructor(
    private id: string,
    private name: string,
    private departmentId: string,
    private quantity: number,
    private isActive: boolean,
    private createdAt: Date,
    private updatedAt: Date,
  ) {}

  /** Stock pertence a um único Department e herda o escopo dele. */
  static create(props: StockInput): Stock {
    if (!isValidName(props.name)) {
      throw new Error(
        "Invalid name. Name must be at least 3 characters long and contain only letters and spaces.",
      );
    }
    if (!props.departmentId || !props.departmentId.trim()) {
      throw new Error("Invalid department ID. Stock must belong to a department.");
    }
    const quantity = props.quantity ?? 0;
    if (quantity < 0) {
      throw new Error("Invalid quantity. Stock quantity cannot be negative.");
    }

    return new Stock(
      props.id ?? crypto.randomUUID(),
      props.name,
      props.departmentId,
      quantity,
      props.isActive ?? true,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
    );
  }

  get getId() {
    return this.id;
  }

  get getName() {
    return this.name;
  }

  get getDepartmentId() {
    return this.departmentId;
  }

  get getQuantity() {
    return this.quantity;
  }

  get getIsActive() {
    return this.isActive;
  }

  public touch() {
    this.updatedAt = new Date();
  }

  public setName(newName: string) {
    if (!isValidName(newName)) {
      throw new Error(
        "Invalid name. Name must be at least 3 characters long and contain only letters and spaces.",
      );
    }
    this.name = newName;
    this.touch();
  }

  public increase(amount: number) {
    if (amount <= 0) {
      throw new Error("Invalid amount. Amount to increase must be positive.");
    }
    this.quantity += amount;
    this.touch();
  }

  public decrease(amount: number) {
    if (amount <= 0) {
      throw new Error("Invalid amount. Amount to decrease must be positive.");
    }
    if (amount > this.quantity) {
      throw new Error("Insufficient stock quantity.");
    }
    this.quantity -= amount;
    this.touch();
  }

  public activate() {
    this.isActive = true;
    this.touch();
  }

  public deactivate() {
    this.isActive = false;
    this.touch();
  }
}
