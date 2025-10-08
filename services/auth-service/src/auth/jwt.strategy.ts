import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service';
import { verifyToken } from '@bitpesa/shared-utils';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    try {
      // Verify token manually to ensure it's valid
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const verifiedPayload = await verifyToken(token);
      if (!verifiedPayload) {
        throw new UnauthorizedException('Invalid token');
      }

      const user = await this.authService.validateUser(verifiedPayload);
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
