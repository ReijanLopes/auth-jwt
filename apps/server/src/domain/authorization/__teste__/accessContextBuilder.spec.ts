import { describe, expect, it, jest } from "@jest/globals";
import { Company } from "../../company/entities/company";
import { CompanyRepository } from "../../company/repositories/companyRepository";
import { Department } from "../../department/entities/department";
import { DepartmentRepository } from "../../department/repositories/departmentRepository";
import { Role, UserRole } from "../../role/entities/role";
import { User } from "../../user/entities/user";
import { UserRepository } from "../../user/repositories/userRepository";
import { buildAccessContext, buildOrgTrees } from "../accessContextBuilder";

function notImplemented(): never {
  throw new Error("not implemented in this fake");
}

function fakeUserRepo(user: User | null): UserRepository {
  return {
    save: notImplemented,
    findAll: notImplemented,
    findById: jest.fn(async () => user),
    findByEmail: notImplemented,
    findByTaxId: notImplemented,
    updatePassword: notImplemented,
  };
}

function fakeCompanyRepo(
  byId: Company | null,
  headquartersResult: Company[] = [],
): CompanyRepository {
  return {
    save: notImplemented,
    findById: jest.fn(async () => byId),
    findByHeadquartersId: jest.fn(async () => headquartersResult),
  };
}

function fakeDepartmentRepo(byCompanyId: Department[] = []): DepartmentRepository {
  return {
    save: notImplemented,
    findById: notImplemented,
    findByCompanyId: jest.fn(async () => byCompanyId),
    findByParentId: notImplemented,
  };
}

const managerRole = Role.from({ name: UserRole.MANAGER, level: 3 });

const hq = Company.createHeadquarters({ name: "Sede Central", taxId: "hq-tax" });
const franchise = Company.createFranchise(hq, { name: "Franquia A", taxId: "fa-tax" });

const user = User.create({
  name: "Fulano de Tal",
  email: "fulano@example.com",
  phone: "11999999999",
  password: "hashed",
  taxId: "52998224725",
  role: managerRole,
  companyId: franchise.getId,
  departmentId: "dept-1",
});

describe("buildAccessContext", () => {
  it("monta o AccessContext a partir do usuário e da empresa dele", async () => {
    const userRepo = fakeUserRepo(user);
    const companyRepo = fakeCompanyRepo(franchise);

    const access = await buildAccessContext(user.getId, { userRepo, companyRepo });

    expect(access).toEqual({
      userId: user.getId,
      company: { id: franchise.getId, parentId: franchise.getParentId },
      role: UserRole.MANAGER,
      level: 3,
      departmentId: "dept-1",
    });
  });

  it("lança erro quando o usuário não existe", async () => {
    const userRepo = fakeUserRepo(null);
    const companyRepo = fakeCompanyRepo(franchise);

    await expect(buildAccessContext("missing", { userRepo, companyRepo })).rejects.toThrow(
      "User not found.",
    );
  });

  it("lança erro quando a empresa do usuário não existe", async () => {
    const userRepo = fakeUserRepo(user);
    const companyRepo = fakeCompanyRepo(null);

    await expect(buildAccessContext(user.getId, { userRepo, companyRepo })).rejects.toThrow(
      "Company not found.",
    );
  });
});

describe("buildOrgTrees", () => {
  const dept = Department.createRoot({ name: "Departamento Raiz", companyId: hq.getId });

  it("busca sede + franquias quando o usuário é da sede", async () => {
    const companyRepo = fakeCompanyRepo(hq, [hq, franchise]);
    const departmentRepo = fakeDepartmentRepo([dept]);

    const access = {
      userId: "u1",
      company: { id: hq.getId, parentId: hq.getParentId },
      role: UserRole.ADMIN,
      level: 4,
      departmentId: dept.getId,
    };

    const trees = await buildOrgTrees(access, { companyRepo, departmentRepo });

    expect(companyRepo.findByHeadquartersId).toHaveBeenCalledWith(hq.getId);
    expect(trees.companies).toEqual([
      { id: hq.getId, parentId: null },
      { id: franchise.getId, parentId: hq.getId },
    ]);
    expect(trees.departments).toEqual([
      { id: dept.getId, companyId: hq.getId, parentId: null },
    ]);
  });

  it("não busca a árvore de empresas quando o usuário é de uma franquia", async () => {
    const companyRepo = fakeCompanyRepo(franchise);
    const departmentRepo = fakeDepartmentRepo([]);

    const access = {
      userId: "u2",
      company: { id: franchise.getId, parentId: franchise.getParentId },
      role: UserRole.MANAGER,
      level: 3,
      departmentId: "dept-1",
    };

    const trees = await buildOrgTrees(access, { companyRepo, departmentRepo });

    expect(companyRepo.findByHeadquartersId).not.toHaveBeenCalled();
    expect(trees.companies).toEqual([{ id: franchise.getId, parentId: hq.getId }]);
  });
});
