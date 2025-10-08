import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { LoginCredentials, AuthResult } from '@bitpesa/shared-utils';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthService');
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    this.logger.log(`Login attempt for user: ${credentials.username}`);
    
    try {
      const result = await this.userService.authenticate(credentials);
      
      if (result.success) {
        this.logger.log(`Login successful for user: ${credentials.username}`);
      } else {
        this.logger.warn(`Login failed for user: ${credentials.username} - ${result.error}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error('Login error', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  async validateUser(payload: any): Promise<any> {
    try {
      const user = await this.userService.getUserById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      return user;
    } catch (error) {
      this.logger.error('User validation error', error);
      throw new UnauthorizedException('Invalid user');
    }
  }
}
