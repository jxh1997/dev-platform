import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppRequest,
  CurrentRequest,
  Identity,
  Permission,
} from '../common/http';
import { SuccessResponse } from '../auth/auth.dto';
import { SystemService } from './system.service';
import {
  AssignRolesDto,
  CreateMenuDto,
  CreateRoleDto,
  CreateUserDto,
  ExpectedVersion,
  PageQuery,
  ResetPasswordDto,
  RoleGrantsDto,
  UpdateMenuDto,
  UpdateRoleDto,
  UpdateUserDto,
  ManagedUserResponse,
  ManagedRoleResponse,
  ManagedMenuResponse,
  UsersPageResponse,
  RolesPageResponse,
  MenusPageResponse,
  PermissionResponse,
  PageComponentResponse,
  SessionResponse,
  SessionIdDto,
} from './system.dto';

@ApiBearerAuth()
@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(private readonly service: SystemService) {}
  @Get('users')
  @Permission('system:user:list')
  @ApiOkResponse({ type: UsersPageResponse })
  users(@CurrentRequest() req: AppRequest, @Query() q: PageQuery) {
    return this.service.users(req.principal, q);
  }
  @Post('users')
  @Permission('system:user:create')
  @ApiCreatedResponse({ type: ManagedUserResponse })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createUser(@CurrentRequest() req: AppRequest, @Body() dto: CreateUserDto) {
    return this.service.createUser(
      req.principal,
      dto,
      req.requestId,
      typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : undefined,
    );
  }
  @Post('users/:id/update')
  @HttpCode(200)
  @Permission('system:user:update')
  @ApiOkResponse({ type: ManagedUserResponse })
  editUser(
    @CurrentRequest() req: AppRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.editUser(req.principal, id, dto, req.requestId);
  }
  @Get('roles')
  @Permission('system:role:list')
  @ApiOkResponse({ type: RolesPageResponse })
  roles(@CurrentRequest() req: AppRequest, @Query() q: PageQuery) {
    return this.service.roles(req.principal, q);
  }
  @Post('roles')
  @Permission('system:role:create')
  @ApiCreatedResponse({ type: ManagedRoleResponse })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createRole(@CurrentRequest() req: AppRequest, @Body() dto: CreateRoleDto) {
    return this.service.createRole(
      req.principal,
      dto,
      req.requestId,
      typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : undefined,
    );
  }
  @Post('roles/:id/update')
  @HttpCode(200)
  @Permission('system:role:update')
  @ApiOkResponse({ type: ManagedRoleResponse })
  editRole(
    @CurrentRequest() req: AppRequest,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.service.editRole(req.principal, id, dto, req.requestId);
  }
  @Post('roles/:id/delete')
  @HttpCode(200)
  @Permission('system:role:delete')
  @ApiOkResponse({ type: SuccessResponse })
  deleteRole(
    @CurrentRequest() req: AppRequest,
    @Param('id') id: string,
    @Body() dto: ExpectedVersion,
  ) {
    return this.service.deleteRole(req.principal, id, dto, req.requestId);
  }
  @Get('menus')
  @Permission('system:menu:list')
  @ApiOkResponse({ type: MenusPageResponse })
  menus(@CurrentRequest() req: AppRequest, @Query() q: PageQuery) {
    return this.service.menus(req.principal, q);
  }
  @Post('menus')
  @Permission('system:menu:create')
  @ApiCreatedResponse({ type: ManagedMenuResponse })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createMenu(@CurrentRequest() req: AppRequest, @Body() dto: CreateMenuDto) {
    return this.service.createMenu(
      req.principal,
      dto,
      req.requestId,
      typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key']
        : undefined,
    );
  }
  @Post('menus/:id/update')
  @HttpCode(200)
  @Permission('system:menu:update')
  @ApiOkResponse({ type: ManagedMenuResponse })
  editMenu(
    @CurrentRequest() req: AppRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.service.editMenu(req.principal, id, dto, req.requestId);
  }
  @Post('menus/:id/delete')
  @HttpCode(200)
  @Permission('system:menu:delete')
  @ApiOkResponse({ type: SuccessResponse })
  deleteMenu(
    @CurrentRequest() req: AppRequest,
    @Param('id') id: string,
    @Body() dto: ExpectedVersion,
  ) {
    return this.service.deleteMenu(req.principal, id, dto, req.requestId);
  }
  @Get('users/:id')
  @Permission('system:user:read')
  @ApiOkResponse({ type: ManagedUserResponse })
  user(@CurrentRequest() r: AppRequest, @Param('id') id: string) {
    return this.service.user(r.principal, id);
  }
  @Post('users/:id/assign-role')
  @HttpCode(200)
  @Permission('system:user:assign-role')
  @ApiOkResponse({ type: ManagedUserResponse })
  assignRoles(
    @CurrentRequest() r: AppRequest,
    @Param('id') id: string,
    @Body() d: AssignRolesDto,
  ) {
    return this.service.assignRoles(r.principal, id, d, r.requestId);
  }
  @Post('users/:id/reset-password')
  @HttpCode(200)
  @Permission('system:user:reset-password')
  @ApiOkResponse({ type: SuccessResponse })
  resetPassword(
    @CurrentRequest() r: AppRequest,
    @Param('id') id: string,
    @Body() d: ResetPasswordDto,
  ) {
    return this.service.resetPassword(r.principal, id, d, r.requestId);
  }
  @Post('roles/:id/grants')
  @HttpCode(200)
  @Permission('system:role:grant')
  @ApiOkResponse({ type: ManagedRoleResponse })
  grants(
    @CurrentRequest() r: AppRequest,
    @Param('id') id: string,
    @Body() d: RoleGrantsDto,
  ) {
    return this.service.grantRole(r.principal, id, d, r.requestId);
  }
  @Get('permissions')
  @Permission('system:permission:list')
  @ApiOkResponse({ type: PermissionResponse, isArray: true })
  permissions(@CurrentRequest() r: AppRequest) {
    return this.service.permissions(r.principal);
  }
  @Get('page-components')
  @Permission('system:menu:list')
  @ApiOkResponse({ type: PageComponentResponse, isArray: true })
  components(@CurrentRequest() r: AppRequest) {
    return this.service.components(r.principal);
  }
  @Get('users/:id/sessions')
  @Permission('system:user:sessions')
  @ApiOkResponse({ type: SessionResponse, isArray: true })
  sessions(@CurrentRequest() r: AppRequest, @Param('id') id: string) {
    return this.service.sessions(r.principal, id);
  }
  @Post('users/:id/revoke-session')
  @HttpCode(200)
  @Permission('system:user:revoke-session')
  @ApiOkResponse({ type: SuccessResponse })
  revoke(
    @CurrentRequest() r: AppRequest,
    @Param('id') id: string,
    @Body() d: SessionIdDto,
  ) {
    return this.service.revokeSession(
      r.principal,
      d.sessionId,
      r.requestId,
      id,
    );
  }
}
@ApiBearerAuth()
@ApiTags('sessions')
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly service: SystemService) {}
  @Get()
  @Identity()
  @ApiOkResponse({ type: SessionResponse, isArray: true })
  sessions(@CurrentRequest() r: AppRequest) {
    if (r.principal.mustChangePassword) return [];
    return this.service.sessions(r.principal);
  }
  @Post('revoke')
  @HttpCode(200)
  @Identity()
  @ApiOkResponse({ type: SuccessResponse })
  revoke(@CurrentRequest() r: AppRequest, @Body() d: SessionIdDto) {
    return this.service.revokeSession(r.principal, d.sessionId, r.requestId);
  }
}
