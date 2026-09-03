import { isValidName } from "../../../shared/validators/nameValidator";

export type DepartmentInput = {
  id?: string;
  name: string;
  companyId: string;
  parentId?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Department {
  private constructor(
    private id: string,
    private name: string,
    private companyId: string,
    private parentId: string | null,
    private isActive: boolean,
    private createdAt: Date,
    private updatedAt: Date,
  ) {}

  /** Cria um departamento raiz da árvore de uma empresa. */
  static createRoot(props: Omit<DepartmentInput, "parentId">): Department {
    return Department.build({ ...props, parentId: null });
  }

  /**
   * Cria um departamento filho de `parent`. A empresa é sempre herdada do
   * pai — a árvore de departamentos nunca cruza empresas.
   */
  static createChild(
    parent: Department,
    props: Omit<DepartmentInput, "parentId" | "companyId">,
  ): Department {
    return Department.build({
      ...props,
      companyId: parent.getCompanyId,
      parentId: parent.getId,
    });
  }

  /** Reidrata um departamento a partir de dados já persistidos (ex.: uma linha do banco). */
  static from(props: DepartmentInput): Department {
    return Department.build(props);
  }

  private static build(props: DepartmentInput): Department {
    if (!isValidName(props.name)) {
      throw new Error(
        "Invalid name. Name must be at least 3 characters long and contain only letters and spaces.",
      );
    }
    if (!props.companyId || !props.companyId.trim()) {
      throw new Error("Invalid company ID. Department must belong to a company.");
    }

    return new Department(
      props.id ?? crypto.randomUUID(),
      props.name,
      props.companyId,
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

  get getCompanyId() {
    return this.companyId;
  }

  /** null quando o departamento é raiz da árvore. */
  get getParentId() {
    return this.parentId;
  }

  get getIsActive() {
    return this.isActive;
  }

  get isRoot(): boolean {
    return this.parentId === null;
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
