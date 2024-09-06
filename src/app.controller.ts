import { Controller, Get } from '@nestjs/common';
import { BotReportService } from './bot_report/bot-report.service';

@Controller('apps')
export class AppController {
  constructor(private readonly botReportService: BotReportService) {}

  @Get()
  async getHello(): Promise<any> {
    return await this.botReportService.getBalancesAndReportTransactions();
  }
}
