import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform_admin')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  listDevices(@Query('licenseId') licenseId?: string) {
    return this.devicesService.listDevices(licenseId);
  }

  @Post(':id/remove')
  @HttpCode(HttpStatus.OK)
  removeDevice(@Param('id') id: string) {
    return this.devicesService.removeDevice(id);
  }

  @Post('license/:licenseId/reset')
  @HttpCode(HttpStatus.OK)
  resetActivations(@Param('licenseId') licenseId: string) {
    return this.devicesService.resetActivations(licenseId);
  }
}
