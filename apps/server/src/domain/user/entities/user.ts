import { isValidEmail } from "../../../shared/validators/emailValidator";
import { isValidName } from "../../../shared/validators/nameValidator";
import { isValidPassword } from "../../../shared/validators/passwordValidator";
import { isValidPhone } from "../../../shared/validators/phoneValidator";
import { isValidTaxId } from "../../../shared/validators/taxIdValidator";

import { Media } from "../../media/entities/media";
import { Role, UserRole } from "../../role/entities/role";

export type UserInput = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  taxId: string;
  role: Role;
  media?: Media;
  isActive?: boolean;
  updatedAt?: Date;
  createdAt?: Date;
};

export class User {
  private constructor(
    private id: string,
    private name: string,
    private email: string,
    private phone: string,
    private taxId: string,
    private role: Role,
    private password: string,
    private media: Media | null = null,
    private isActive: boolean,
    private createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: UserInput): User {
    if (!isValidName(props.name)) {
      throw new Error(
        "Invalid name. Name must be at least 3 characters long and contain only letters and spaces.",
      );
    }
    if (!isValidEmail(props.email)) {
      throw new Error("Invalid email format.");
    }
    if (!isValidPhone(props.phone)) {
      throw new Error(
        "Invalid phone number format. Phone number must contain only digits, parentheses, hyphens, and spaces, and must be between 10 and 11 digits long.",
      );
    }
    if (!isValidTaxId(props.taxId)) {
      throw new Error(
        "Invalid tax ID format. Tax ID must be a valid CPF number.",
      );
    }
    if (!isValidPassword(props.password)) {
      throw new Error(
        "Invalid password. Password must be at least 8 characters long.",
      );
    }

    return new User(
      props.id ?? crypto.randomUUID(),
      props.name,
      props.email,
      props.phone,
      props.taxId,
      props.role ?? UserRole.EMPLOYEE, // ?? em vez de ||
      props.password,
      props.media ?? null,
      props.isActive ?? true, // ?? garante false como valor válido
      props.createdAt ?? new Date(), // nunca undefined
      props.updatedAt ?? new Date(), // nunca undefined
    );
  }

  get getId() {
    return this.id;
  }
  get getName() {
    return this.name;
  }
  get getEmail() {
    return this.email;
  }
  get getPhone() {
    return this.phone;
  }
  get getTaxId() {
    return this.taxId;
  }
  get getRole() {
    return this.role;
  }
  get getIsActive() {
    return this.isActive;
  }
  get getMedia() {
    return this.media;
  }

  /** @internal — usar apenas em contexto de autenticação */
  get getPassword() {
    return this.password;
  }

  public touch() {
    this.updatedAt = new Date();
  }

  public setRole(newRole: Role) {
    this.role = newRole;
    this.touch();
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

  public setPhone(newPhone: string) {
    if (!isValidPhone(newPhone)) {
      throw new Error(
        "Invalid phone number format. Phone number must contain only digits, parentheses, hyphens, and spaces, and must be between 10 and 11 digits long.",
      );
    }
    this.phone = newPhone;
    this.touch();
  }

  public setTaxId(newTaxId: string) {
    if (!isValidTaxId(newTaxId)) {
      throw new Error(
        "Invalid tax ID format. Tax ID must be a valid CPF number.",
      );
    }
    this.taxId = newTaxId;
    this.touch();
  }

  public setPassword(newPassword: string) {
    if (!isValidPassword(newPassword)) {
      throw new Error(
        "Invalid password. Password must be at least 8 characters long.",
      );
    }
    this.password = newPassword;
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
