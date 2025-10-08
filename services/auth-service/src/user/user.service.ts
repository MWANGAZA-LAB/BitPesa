import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { 
  User, 
  LoginCredentials, 
  AuthResult, 
  hashPassword, 
  verifyPassword, 
  createToken,
  validatePasswordStrength,
  sanitizeInput
} from '@bitpesa/shared-utils';

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'operator';
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  role?: 'admin' | 'user' | 'operator';
  isActive?: boolean;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('UserService');
  }

  async createUser(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    this.logger.log(`Creating user: ${dto.username}`);

    // Validate password strength
    const passwordValidation = validatePasswordStrength(dto.password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(`Password validation failed: ${passwordValidation.feedback.join(', ')}`);
    }

    // Sanitize inputs
    const sanitizedDto = {
      username: sanitizeInput(dto.username),
      email: sanitizeInput(dto.email),
      password: dto.password,
      role: dto.role,
    };

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: sanitizedDto.username },
          { email: sanitizedDto.email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this username or email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(sanitizedDto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          username: sanitizedDto.username,
          email: sanitizedDto.email,
          password: hashedPassword,
          role: sanitizedDto.role,
          isActive: true,
        },
      });

      this.logger.log(`User created successfully: ${user.id}`);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw new BadRequestException('Failed to create user');
    }
  }

  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    this.logger.log(`Authentication attempt for user: ${credentials.username}`);

    try {
      // Sanitize input
      const sanitizedUsername = sanitizeInput(credentials.username);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { username: sanitizedUsername },
      });

      if (!user) {
        this.logger.warn(`Authentication failed: User not found - ${sanitizedUsername}`);
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      if (!user.isActive) {
        this.logger.warn(`Authentication failed: User inactive - ${sanitizedUsername}`);
        return {
          success: false,
          error: 'Account is deactivated',
        };
      }

      // Verify password
      const isValidPassword = await verifyPassword(credentials.password, user.password);
      if (!isValidPassword) {
        this.logger.warn(`Authentication failed: Invalid password - ${sanitizedUsername}`);
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Create token
      const token = await createToken(user);

      this.logger.log(`Authentication successful: ${user.id}`);
      return {
        success: true,
        token,
        user: this.mapUserToResponse(user),
      };
    } catch (error) {
      this.logger.error('Authentication error', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  async getUserById(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  async getUserByUsername(username: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    this.logger.log(`Updating user: ${id}`);

    const sanitizedDto: any = {};
    if (dto.username) sanitizedDto.username = sanitizeInput(dto.username);
    if (dto.email) sanitizedDto.email = sanitizeInput(dto.email);
    if (dto.role) sanitizedDto.role = dto.role;
    if (dto.isActive !== undefined) sanitizedDto.isActive = dto.isActive;

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: sanitizedDto,
      });

      this.logger.log(`User updated successfully: ${id}`);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logger.error('Failed to update user', error);
      throw new BadRequestException('Failed to update user');
    }
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.log(`Deleting user: ${id}`);

    try {
      await this.prisma.user.delete({
        where: { id },
      });

      this.logger.log(`User deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error('Failed to delete user', error);
      throw new BadRequestException('Failed to delete user');
    }
  }

  async listUsers(skip: number = 0, take: number = 10): Promise<{
    users: Omit<User, 'password'>[];
    total: number;
  }> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map(user => this.mapUserToResponse(user)),
      total,
    };
  }

  private mapUserToResponse(user: any): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
