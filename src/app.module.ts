import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotReportService } from './bot_report/bot-report.service';
import { rabbitmqConfig } from './configs/rabbitmq.config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqConfig.uri],
          queue: rabbitmqConfig.queue,
          queueOptions: {
            durable: true,
            arguments: {
              'x-message-ttl': rabbitmqConfig.messageTtl,
            },
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, BotReportService],
})
export class AppModule {}
