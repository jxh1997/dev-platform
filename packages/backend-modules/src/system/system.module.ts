import { Module } from '@nestjs/common';
import { SystemController, SessionsController } from './system.controller';
import { SystemService } from './system.service';
@Module({
  controllers: [SystemController, SessionsController],
  providers: [SystemService],
})
export class SystemModule {}
