import { prisma } from "../client";
import { Department } from "../../../../domain/department/entities/department";
import { DepartmentRepository } from "../../../../domain/department/repositories/departmentRepository";

export class PrismaDepartmentRepository implements DepartmentRepository {
  async findById(id: string): Promise<Department | null> {
    const record = await prisma.department.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByCompanyId(companyId: string): Promise<Department[]> {
    const records = await prisma.department.findMany({ where: { companyId } });
    return records.map((record) => this.toEntity(record));
  }

  async findByParentId(parentId: string): Promise<Department[]> {
    const records = await prisma.department.findMany({ where: { parentId } });
    return records.map((record) => this.toEntity(record));
  }

  async save(department: Department): Promise<Department> {
    const record = await prisma.department.upsert({
      where: { id: department.getId },
      create: {
        id: department.getId,
        name: department.getName,
        companyId: department.getCompanyId,
        parentId: department.getParentId,
        isActive: department.getIsActive,
      },
      update: {
        name: department.getName,
        companyId: department.getCompanyId,
        parentId: department.getParentId,
        isActive: department.getIsActive,
      },
    });

    return this.toEntity(record);
  }

  private toEntity(record: any): Department {
    return Department.from({
      id: record.id,
      name: record.name,
      companyId: record.companyId,
      parentId: record.parentId,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
