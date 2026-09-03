import { prisma } from "../client";
import { Company } from "../../../../domain/company/entities/company";
import { CompanyRepository } from "../../../../domain/company/repositories/companyRepository";

export class PrismaCompanyRepository implements CompanyRepository {
  async findById(id: string): Promise<Company | null> {
    const record = await prisma.company.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByHeadquartersId(headquartersId: string): Promise<Company[]> {
    const records = await prisma.company.findMany({
      where: { OR: [{ id: headquartersId }, { parentId: headquartersId }] },
    });
    return records.map((record) => this.toEntity(record));
  }

  async save(company: Company): Promise<Company> {
    const record = await prisma.company.upsert({
      where: { id: company.getId },
      create: {
        id: company.getId,
        name: company.getName,
        taxId: company.getTaxId,
        parentId: company.getParentId,
        isActive: company.getIsActive,
      },
      update: {
        name: company.getName,
        taxId: company.getTaxId,
        parentId: company.getParentId,
        isActive: company.getIsActive,
      },
    });

    return this.toEntity(record);
  }

  private toEntity(record: any): Company {
    return Company.from({
      id: record.id,
      name: record.name,
      taxId: record.taxId,
      parentId: record.parentId,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
