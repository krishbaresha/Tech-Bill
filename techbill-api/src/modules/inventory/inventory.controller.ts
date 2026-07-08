import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { BulkCreateUnitsDto } from './dto/bulk-create-units.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { FilterUnitsDto } from './dto/filter-units.dto';
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

@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard')
  @Permissions('inventory.read', 'pos.read')
  getDashboard(@Req() req: RequestWithUser) {
    return this.inventoryService.getDashboard(req.user.tenantId);
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  @Get('categories')
  @Permissions('inventory.read')
  listCategories(@Req() req: RequestWithUser) {
    return this.inventoryService.listCategories(req.user.tenantId);
  }

  @Get('products')
  @Permissions('inventory.read')
  listProducts(@Req() req: RequestWithUser) {
    return this.inventoryService.listProducts(req.user.tenantId);
  }

  @Get('products/:id')
  @Permissions('inventory.read')
  getProduct(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.inventoryService.getProduct(id, req.user.tenantId);
  }

  @Post('products')
  @Permissions('inventory.write')
  createProduct(@Body() dto: CreateProductDto, @Req() req: RequestWithUser) {
    return this.inventoryService.createProduct(
      dto,
      req.user.id,
      req.user.tenantId,
    );
  }

  @Patch('products/:id')
  @Permissions('inventory.write')
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventoryService.updateProduct(id, dto, req.user.tenantId);
  }

  // ─── Units ────────────────────────────────────────────────────────────────

  @Get('units')
  @Permissions('inventory.read', 'pos.sell')
  listUnits(@Query() filter: FilterUnitsDto, @Req() req: RequestWithUser) {
    return this.inventoryService.listUnits(filter, req.user.tenantId);
  }

  @Get('units/lookup/:serial')
  @Permissions('inventory.read', 'pos.sell')
  lookupBySerial(
    @Param('serial') serial: string,
    @Query('anyStatus') anyStatus: string,
    @Req() req: RequestWithUser,
  ) {
    return this.inventoryService.lookupBySerial(
      serial,
      req.user.tenantId,
      anyStatus === 'true',
    );
  }

  @Post('units')
  @Permissions('inventory.write')
  createUnit(@Body() dto: CreateUnitDto, @Req() req: RequestWithUser) {
    return this.inventoryService.createUnit(dto, req.user.id, req.user.tenantId);
  }

  @Post('units/bulk')
  @Permissions('inventory.write')
  bulkCreateUnits(
    @Body() dto: BulkCreateUnitsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventoryService.bulkCreateUnits(dto, req.user.id, req.user.tenantId);
  }

  @Patch('units/:id')
  @Permissions('inventory.write')
  updateUnit(
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventoryService.updateUnit(id, dto, req.user.id, req.user.tenantId);
  }

  @Post('products/:id/enrich')
  @Permissions('inventory.write')
  @HttpCode(HttpStatus.OK)
  enrichProduct(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.inventoryService.enrichProduct(id, req.user.tenantId);
  }

  @Delete('products/:id')
  @Permissions('inventory.delete')
  @HttpCode(HttpStatus.OK)
  deleteProduct(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.inventoryService.softDeleteProduct(id, req.user.tenantId);
  }

  // ─── Suppliers ────────────────────────────────────────────────────────────

  @Get('suppliers')
  @Permissions('suppliers.read')
  listSuppliers(@Req() req: RequestWithUser) {
    return this.inventoryService.listSuppliers(req.user.tenantId);
  }

  @Post('suppliers')
  @Permissions('suppliers.write')
  @HttpCode(HttpStatus.CREATED)
  createSupplier(
    @Body() body: Record<string, string>,
    @Req() req: RequestWithUser,
  ) {
    return this.inventoryService.createSupplier(body as any, req.user.tenantId);
  }

  // ─── Purchase Orders ──────────────────────────────────────────────────────

  @Get('purchase-orders')
  @Permissions('suppliers.read')
  listPurchaseOrders(@Req() req: RequestWithUser) {
    return this.inventoryService.listPurchaseOrders(req.user.tenantId);
  }

  @Post('purchase-orders')
  @Permissions('suppliers.write')
  @HttpCode(HttpStatus.CREATED)
  createPurchaseOrder(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.inventoryService.createPurchaseOrder(
      body as any,
      req.user.id,
      req.user.tenantId,
    );
  }

  // ─── GRN ─────────────────────────────────────────────────────────────────

  @Get('grn/:id')
  @Permissions('suppliers.read')
  getGrn(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.inventoryService.getGrn(id, req.user.tenantId);
  }

  @Post('grn')
  @Permissions('suppliers.write')
  @HttpCode(HttpStatus.CREATED)
  createGrn(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.inventoryService.createGrn(
      body as any,
      req.user.id,
      req.user.tenantId,
    );
  }
}
