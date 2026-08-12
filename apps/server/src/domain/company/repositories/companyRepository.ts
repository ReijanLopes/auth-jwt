import { Company } from "../entities/company";

export interface CompanyRepository {
  save(company: Company): Promise<Company>;
  findById(id: string): Promise<Company | null>;
  /** Sede + todas as franquias dela (parentId === headquartersId). */
  findByHeadquartersId(headquartersId: string): Promise<Company[]>;
}
