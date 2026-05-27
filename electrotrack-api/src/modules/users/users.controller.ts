import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

interface RequestWithUser extends Request {
  user: {
    id: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Permissions('users.read')
  listUsers(@Req() req: RequestWithUser) {
    return this.usersService.listUsers(req.user.tenantId);
  }

  @Post()
  @Permissions('users.manage')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() dto: CreateUserDto, @Req() req: RequestWithUser) {
    return this.usersService.createUser(dto, req.user.tenantId);
  }

  @Patch(':id')
  @Permissions('users.manage')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.updateUser(id, dto, req.user.tenantId);
  }

  @Patch(':id/password')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param('id') id: string,
    @Body() body: { password?: string; newPassword?: string },
    @Req() req: RequestWithUser,
  ) {
    // Handle both field names to be robust
    const newPwd = body.newPassword || body.password;
    if (!newPwd || newPwd.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    return this.usersService.resetPassword(id, newPwd, req.user.tenantId);
  }

  @Delete(':id')
  @Permissions('users.manage')
  @HttpCode(HttpStatus.OK)
  deleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.usersService.deleteUser(id, req.user.tenantId);
  }

  @Get(':id/activity')
  @Permissions('users.read')
  getUserActivity(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.usersService.getUserActivity(id, req.user.tenantId);
  }
}
