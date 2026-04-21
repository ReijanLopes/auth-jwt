import { User } from "../../user/entities/user";

import { JwtService, TokenPair } from "../services/jwtService";
import { AuthRepository } from "../repositories/authRepository";
import { RefreshToken } from "../entities/refreshToken";
import { UserRole } from "../../role/entities/role";
import { HashService } from "../services/hashService";
import { UserRepository } from "../../user/repositories/userRepository";
import { RoleRepository } from "../../role/repositories/roleRepository";
import { isValidPassword } from "../../../shared/validators/passwordValidator";

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  taxId: string;
  role?: UserRole;
};

export class RegisterUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authRepo: AuthRepository,
    private readonly roleRepo: RoleRepository,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: RegisterInput): Promise<TokenPair> {
    if (!isValidPassword(input.password)) {
      throw new Error(
        "Invalid password. Password must be at least 8 characters long and include at least one letter and one number.",
      );
    }

    //Adicione pagemento para definir o role do usuário, caso queira permitir que o cliente escolha o role na hora do cadastro, lembre-se de validar se o role existe e se o cliente tem permissão para criar um usuário com aquele role
    const roleName = input.role ?? UserRole.EMPLOYEE;
    const [emailExisting, taxIdExisting, role, hashedPassword] =
      await Promise.all([
        this.userRepo.findByEmail(input.email),
        this.userRepo.findByTaxId(input.taxId),
        this.roleRepo.findByName(roleName),
        this.hashService.hash(input.password),
      ]);

    if (emailExisting) throw new Error("Email already in use.");
    if (taxIdExisting) throw new Error("Tax ID already in use.");
    if (!role)
      throw new Error(`Role "${roleName}" not found. Run the seed first.`);

    const user = User.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      taxId: input.taxId,
      password: hashedPassword,
      role,
    });

    const tokens = this.jwtService.generateTokenPair({
      sub: user.getId,
      role: user.getRole.getName,
    });

    // Paraleliza save do user + hash do refreshToken
    const [, hashedRefreshToken] = await Promise.all([
      this.userRepo.save(user),
      this.hashService.hash(tokens.refreshToken),
    ]);

    const refreshToken = RefreshToken.create({
      userId: user.getId,
      token: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.authRepo.saveRefreshToken(refreshToken);

    return tokens;
  }
}
