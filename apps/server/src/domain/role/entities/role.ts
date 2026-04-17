import { isValidKey } from "../../../shared/utils/objectUtils";

export enum UserRole {
  MASTER = "MASTER", // Nível 5
  ADMIN = "ADMIN", // Nível 4
  MANAGER = "MANAGER", // Nível 3
  SUPERVISOR = "SUPERVISOR", // Nível 2
  EMPLOYEE = "EMPLOYEE", // Nível 1
}

export const RoleWeight: Record<UserRole, number> = {
  [UserRole.MASTER]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.MANAGER]: 3,
  [UserRole.SUPERVISOR]: 2,
  [UserRole.EMPLOYEE]: 1,
};

type RoleInput = {
  id?: string;
  name: string;
  level: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export class Role {
  constructor(
    private name: string,
    private level: number,
    private id: string = crypto.randomUUID(),
    private createdAt: Date = new Date(),
    private updatedAt: Date = new Date(),
  ) {}

  static from(props: RoleInput): Role {
    const isValidName = isValidKey(UserRole, props.name)
    if (!isValidName) {
      throw new Error(`Invalid user role`);
    }
    
    return new Role(
        props.name, 
        RoleWeight[props.name as UserRole],
        props.id ?? crypto.randomUUID(),
        props.createdAt,
        props.updatedAt
    );
  }

  get getId() {
    return this.id;
  }

  get getLevel(): number {
    return this.level;
  }
  
  get getName() {
    return this.name;
  }
}

// 3. Agora as subclasses vão funcionar perfeitamente!
export class MasterRole extends Role {
  constructor() {
    super(UserRole.MASTER, RoleWeight[UserRole.MASTER]);
  }
}

export class AdminRole extends Role {
  constructor() {
    super(UserRole.ADMIN, RoleWeight[UserRole.ADMIN]);
  }
}

export class ManagerRole extends Role {
  constructor() {
    super(UserRole.MANAGER, RoleWeight[UserRole.MANAGER]);
  }
}

export class SupervisorRole extends Role {
  constructor() {
    super(UserRole.SUPERVISOR, RoleWeight[UserRole.SUPERVISOR]);
  }
}

export class EmployeeRole extends Role {
  constructor() {
    super(UserRole.EMPLOYEE, RoleWeight[UserRole.EMPLOYEE]);
  }
}