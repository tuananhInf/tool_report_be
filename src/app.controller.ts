import { Controller, Get } from '@nestjs/common';
import { BotReportService } from './bot_report/bot-report.service';

@Controller('tools')
export class AppController {
  constructor(private readonly botReportService: BotReportService) {}

  @Get('start')
  async startReport(): Promise<any> {
    return await this.botReportService.getBalancesAndReportTransactions();
  }
}
