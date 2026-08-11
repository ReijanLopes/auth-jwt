import { isValidName } from "../../../shared/validators/nameValidator";

export type CompanyInput = {
  id?: string;
  name: string;
  taxId: string;
  parentId?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Company {
  private constructor(
    private id: string,
    private name: string,
    private taxId: string,
    private parentId: string | null,
    private isActive: boolean,
    private createdAt: Date,
    private updatedAt: Date,
  ) {}

  /** Cria a sede (franqueadora). Sede nunca tem parentId. */
  static createHeadquarters(
    props: Omit<CompanyInput, "parentId">,
  ): Company {
    return Company.build({ ...props, parentId: null });
  }

  /**
   * Cria uma franquia. O `parent` precisa ser a própria sede — a hierarquia
   * tem exatamente dois níveis, então uma franquia nunca pode ser filha de
   * outra franquia.
   */
  static createFranchise(
    parent: Company,
    props: Omit<CompanyInput, "parentId">,
  ): Company {
    if (!parent.isHeadquarters) {
      throw new Error(
        "Invalid parent company. A franchise must be created under a headquarters (the hierarchy has exactly two levels).",
      );
    }
    return Company.build({ ...props, parentId: parent.getId });
  }

  private static build(props: CompanyInput): Company {
    if (!isValidName(props.name)) {
      throw new Error(
        "Invalid name. Name must be at least 3 characters long and contain only letters and spaces.",
      );
    }
    if (!props.taxId || !props.taxId.trim()) {
      throw new Error("Invalid tax ID. Company must have a tax ID.");
    }

    return new Company(
      props.id ?? crypto.randomUUID(),
      props.name,
      props.taxId,
      props.parentId ?? null,
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

  get getTaxId() {
    return this.taxId;
  }

  /** null quando a empresa é a sede; caso contrário, id da sede. */
  get getParentId() {
    return this.parentId;
  }

  get getIsActive() {
    return this.isActive;
  }

  get isHeadquarters(): boolean {
    return this.parentId === null;
  }

  get isFranchise(): boolean {
    return this.parentId !== null;
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

  public activate() {
    this.isActive = true;
    this.touch();
  }

  public deactivate() {
    this.isActive = false;
    this.touch();
  }
}
