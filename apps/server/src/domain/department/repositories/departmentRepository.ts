import { Department } from "../entities/department";

export interface DepartmentRepository {
  save(department: Department): Promise<Department>;
  findById(id: string): Promise<Department | null>;
  findByCompanyId(companyId: string): Promise<Department[]>;
  /** Filhos diretos de um departamento (para percorrer a árvore). */
  findByParentId(parentId: string): Promise<Department[]>;
}
