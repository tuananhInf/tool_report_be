import { Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { rabbitmqConfig } from '../configs/rabbitmq.config';
import { MevMessage } from '../bot_report/interfaces/mev-message.interface';

@Injectable()
export class RabbitMQService {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqConfig.uri],
        queue: rabbitmqConfig.queue,
      },
    });
  }

  async sendMevMessage(message: MevMessage) {
    try {
      return this.client
        .emit<MevMessage>(rabbitmqConfig.routingKey, message)
        .toPromise();
    } catch (error) {
      console.error('Error sending message to RabbitMQ:', error);
      throw error;
    }
  }
}
