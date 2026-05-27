import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Optionally override canActivate for extra checks
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // default behavior
    return super.canActivate(context);
  }
}
