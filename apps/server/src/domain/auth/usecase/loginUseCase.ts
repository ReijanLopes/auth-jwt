import { UserRepository } from "../../user/repositories/userRepository";
import { HashService } from "../services/hashService";
import { JwtService, TokenPair } from "../services/jwtService";
import { AuthRepository } from "../repositories/authRepository";
import { RefreshToken } from "../entities/refreshToken";

type LoginInput = {
  email: string;
  password: string;
};

export class LoginUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authRepo: AuthRepository,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<TokenPair> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new Error("Invalid credentials.");
    }

    if (!user.getIsActive) {
      throw new Error("User account is deactivated.");
    }

    const passwordMatch = await this.hashService.compare(
      input.password,
      user.getPassword,  // adicione getter na entidade (ver nota abaixo)
    );
    if (!passwordMatch) {
      throw new Error("Invalid credentials.");
    }

    const tokens = this.jwtService.generateTokenPair({
      sub: user.getId,
      role: user.getRole.getName,
    });

    const refreshToken = RefreshToken.create({
      userId: user.getId,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    });

    await this.authRepo.saveRefreshToken(refreshToken);

    return tokens;
  }
}