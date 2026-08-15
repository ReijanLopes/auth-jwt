import { UserRole } from "../role/entities/role";

export type CompanyNode = {
  id: string;
  /** null quando a empresa é a sede. */
  parentId: string | null;
};

export type DepartmentNode = {
  id: string;
  companyId: string;
  /** null quando o departamento é raiz da árvore da empresa. */
  parentId: string | null;
};

/**
 * Principal da política. A role sozinha não basta — ela não conhece as
 * árvores de empresa/departamento, então o contexto carrega a posição do
 * usuário nelas.
 */
export type AccessContext = {
  userId: string;
  company: CompanyNode;
  role: UserRole;
  level: number;
  departmentId: string;
};

export type Action = "read" | "write";

export type ResourceType = "company" | "department" | "employee" | "stock";

export type CompanyResource = {
  type: "company";
  id: string;
  parentId: string | null;
};

export type DepartmentResource = {
  type: "department";
  id: string;
  companyId: string;
};

export type EmployeeResource = {
  type: "employee";
  id: string;
  companyId: string;
  departmentId: string;
  level: number;
  /** true quando o recurso é o próprio AccessContext.userId. */
  isSelf: boolean;
};

export type StockResource = {
  type: "stock";
  id: string;
  companyId: string;
  departmentId: string;
};

export type Resource =
  | CompanyResource
  | DepartmentResource
  | EmployeeResource
  | StockResource;

export type OrgTrees = {
  companies: CompanyNode[];
  departments: DepartmentNode[];
};
