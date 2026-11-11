import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import {
  AuthGuard,
  AuthModule,
  RecordsModule,
  SystemModule,
  Public,
} from '../../../../packages/backend-modules/src';
import { DatabaseModule } from './database.module';

export class HealthResponse {
  @ApiProperty() status!: string;
}
@Controller('health')
class HealthController {
  constructor(private readonly db: DataSource) {}
  @Public()
  @Get('live')
  @ApiOkResponse({ type: HealthResponse })
  live() {
    return { status: 'ok' };
  }
  @Public()
  @Get('ready')
  @ApiOkResponse({ type: HealthResponse })
  async ready() {
    await this.db.query('SELECT 1');
    return { status: 'ok' };
  }
}

@Module({
  imports: [DatabaseModule, AuthModule, RecordsModule, SystemModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
