import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AppRequest,
  CurrentRequest,
  Permission,
  validId,
} from '../../common/http';
import {
  CreateRecordDto,
  DeleteRecordResponse,
  QueryRecordsDto,
  RecordResponse,
  RecordsPageResponse,
  UpdateRecordDto,
  VersionDto,
} from './records.dto';
import { RecordsService } from './records.service';

@ApiTags('records')
@ApiBearerAuth()
@Controller('demo/records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}
  @Permission('demo:record:list')
  @Get()
  @ApiOkResponse({ type: RecordsPageResponse })
  list(@CurrentRequest() req: AppRequest, @Query() dto: QueryRecordsDto) {
    return this.records.list(req.principal, dto);
  }
  @Permission('demo:record:read')
  @Get(':id')
  @ApiOkResponse({ type: RecordResponse })
  read(@CurrentRequest() req: AppRequest, @Param('id') id: string) {
    return this.records.read(req.principal, validId(id));
  }
  @Permission('demo:record:create')
  @Post()
  @ApiCreatedResponse({ type: RecordResponse })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(
    @CurrentRequest() req: AppRequest,
    @Body() dto: CreateRecordDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    return this.records.create(req, dto, key);
  }
  @Permission('demo:record:update')
  @Post(':id/update')
  @HttpCode(200)
  @ApiOkResponse({ type: RecordResponse })
  update(
    @CurrentRequest() req: AppRequest,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.records.update(req, validId(id), dto);
  }
  @Permission('demo:record:delete')
  @Post(':id/delete')
  @HttpCode(200)
  @ApiOkResponse({ type: DeleteRecordResponse })
  remove(
    @CurrentRequest() req: AppRequest,
    @Param('id') id: string,
    @Body() dto: VersionDto,
  ) {
    return this.records.remove(req, validId(id), dto.version);
  }
}
