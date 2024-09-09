import { Web3 } from 'web3';
import * as moment from 'moment-timezone';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { rabbitmqConfig } from '../configs/rabbitmq.config';
import { MevMessage } from './interfaces/mev-message.interface';
import { Cron, CronExpression } from '@nestjs/schedule';

const LIMIT = 25;
const BLOCK_TIME = 3; // Thời gian trung bình giữa các block (giây)
const MAX_RETRIES = 5;
const RETRY_DELAY = 60000; // 1 phút trong milliseconds
@Injectable()
export class BotReportService {
  private web3: Web3;

  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {
    this.web3 = new Web3(
      new Web3.providers.HttpProvider(process.env.RONIN_RPC),
    );
  }

  async sendMevMessage(message: MevMessage) {
    try {
      await this.client.emit<MevMessage>(rabbitmqConfig.routingKey, message);
      Logger.log('Send message successfully');
      return { status: 'success' };
    } catch (error) {
      console.error('Error sending message to RabbitMQ:', error);
      throw error;
    }
  }

  async sendDailyReport(data: string) {
    try {
      const message: MevMessage = {
        from: process.env.RABBITMQ_MESSAGE_FROM,
        module: process.env.RABBITMQ_MESSAGE_MODULE,
        content: {
          type: process.env.RABBITMQ_CONTENT_TYPE,
          level: process.env.RABBITMQ_CONTENT_LEVEL,
          data: data,
        },
      };

      return this.sendMevMessage(message);
    } catch (e) {
      throw e;
    }
  }

  async getTodayTransactions(
    timestamp7HourPre: any,
    timestamp7HourCurrent: any,
  ) {
    let offset = 0;
    try {
      const transactionsFailed = [];
      const transactionsSucceeded = [];

      while (true) {
        const endpoint = `${process.env.BASE_URL_TRANSACTIONS}${process.env.BOT_ADDRESS}/txs?offset=${offset}&limit=${LIMIT}`;

        // Gọi API
        const response = await fetch(endpoint);
        const data = await response.json();

        if (
          !data.result ||
          !data.result.items ||
          data.result.items.length === 0
        ) {
          break;
        }

        // Lọc và phân loại các giao dịch
        for (const tx of data.result.items) {
          const txTimestamp = tx.blockTime;

          if (txTimestamp < timestamp7HourPre) {
            // Đã đến giao dịch trước khoảng thời gian mong muốn, dừng vòng lặp
            return {
              transactionsFailed,
              transactionsSucceeded,
              failed: transactionsFailed.length,
              success: transactionsSucceeded.length,
            };
          }

          if (txTimestamp < timestamp7HourCurrent) {
            if (tx.status === 0) {
              transactionsFailed.push(tx);
            } else {
              transactionsSucceeded.push(tx);
            }
          }
        }

        // Tăng offset cho lần gọi API tiếp theo
        offset += LIMIT;
      }

      return {
        transactionsFailed,
        transactionsSucceeded,
        failed: transactionsFailed.length,
        success: transactionsSucceeded.length,
      };
    } catch (e) {
      throw e;
    }
  }

  getTimestamps(timezone: string = 'Asia/Ho_Chi_Minh') {
    try {
      // Lấy ngày hiện tại trong múi giờ được chỉ định
      const today = moment.tz(timezone);

      // Đặt thời gian là 7 giờ sáng cho ngày hôm nay
      const today7am = today
        .clone()
        .hours(7)
        .minutes(0)
        .seconds(0)
        .milliseconds(0);

      // Tính ngày hôm trước
      const yesterday7am = today7am.clone().subtract(1, 'days');

      // Chuyển đổi sang timestamp (số giây kể từ epoch)
      const today7amTimestamp: number = today7am.unix();
      const yesterday7amTimestamp: number = yesterday7am.unix();

      return { today7amTimestamp, yesterday7amTimestamp };
    } catch (e) {
      throw e;
    }
  }

  // Hàm phụ trợ để tìm block gần nhất với một timestamp cụ thể
  async findNearestBlockTo(targetTimestamp: number): Promise<number> {
    try {
      const latestBlock = await this.web3.eth.getBlock();
      const currentTimestamp = Number(latestBlock.timestamp.toString());
      const blockNumberBigint = Number(latestBlock.number.toString());

      // Ước tính số block giữa thời điểm hiện tại và 7h sáng
      const timeDifference = Math.abs(currentTimestamp - targetTimestamp);
      const estimatedBlocksAgo = Math.floor(timeDifference / BLOCK_TIME);

      let estimatedTargetBlock = blockNumberBigint - estimatedBlocksAgo;
      // Kiểm tra và điều chỉnh ước tính
      let block = await this.web3.eth.getBlock(estimatedTargetBlock.toString());
      // Điều chỉnh nếu ước tính chưa chính xác
      while (
        Math.abs(Number(block.timestamp) - targetTimestamp) >= BLOCK_TIME
      ) {
        if (block.timestamp > targetTimestamp) {
          estimatedTargetBlock--;
        } else {
          estimatedTargetBlock++;
        }

        block = await this.web3.eth.getBlock(estimatedTargetBlock);
      }
      return estimatedTargetBlock;
    } catch (e) {
      throw e;
    }
  }

  async makePostRequest(endpoint: string, body: any, method: string) {
    const headers = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
    }
  }

  async getRoninBalance(blockNumber: number) {
    try {
      const endpoint = `${process.env.BASE_URL_BALANCE}${process.env.BOT_ADDRESS}/`;
      const body = JSON.stringify({ blockNumber: blockNumber });
      // Gọi API
      const response = await this.makePostRequest(endpoint, body, 'POST');
      const result = await response;
      const balances = [];
      for (const balance of result.data.balances) {
        balances.push({
          token: balance.tokenSymbol,
          balance: balance.userBalance / 10 ** balance.tokenDecimals,
        });
      }
      return balances;
    } catch (error) {
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async getBalancesAndReportTransactions() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { today7amTimestamp, yesterday7amTimestamp } =
          this.getTimestamps();
        const numberBlockPre = await this.findNearestBlockTo(
          yesterday7amTimestamp,
        );
        const numberBlockCurrent =
          await this.findNearestBlockTo(today7amTimestamp);
        const balancesPre = await this.getRoninBalance(numberBlockPre);
        const balancesCurrent = await this.getRoninBalance(numberBlockCurrent);

        const difference = balancesCurrent.map((current, index) => ({
          token: current.token,
          difference_balance: current.balance - balancesPre[index].balance,
        }));

        const transactionReports = await this.getTodayTransactions(
          yesterday7amTimestamp,
          today7amTimestamp,
        );
        const { failed, success } = transactionReports;

        return await this.sendDailyReport(
          JSON.stringify({
            failed,
            success,
            balances_yesterday: balancesPre,
            balances_today: balancesCurrent,
            difference,
            date: new Date().toLocaleDateString(),
          }),
        );
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt === MAX_RETRIES) {
          throw new Error('Max retries reached. Operation failed.');
        }

        console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
}
