import { Web3 } from 'web3';
import { RONIN_RPC } from '../constants/bot.constants';
export class BotReportService {
  private web3: Web3;
  constructor() {
    this.web3 = new Web3(new Web3.providers.HttpProvider(RONIN_RPC));
  }
  async getTodayTransactions(address: string) {
    const latestBlock = await this.web3.eth.getBlockNumber();
    const transactions = [];
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = now - (now % 86400); // Đầu ngày hôm nay (UTC)

    for (let i = latestBlock; i >= 0; i--) {
      const block = await this.web3.eth.getBlock(i, true);
      if (block && block.transactions) {
        if (block.timestamp < startOfDay) {
          break; // Dừng nếu đã đến block của ngày hôm trước
        }
        for (const tx of block.transactions) {
          const txParsed: any = tx;
          if (
            txParsed.from.toLowerCase() === address.toLowerCase() ||
            (txParsed.to && txParsed.to.toLowerCase() === address.toLowerCase())
          ) {
            transactions.push(txParsed);
          }
        }
      }
    }

    return transactions;
  }

  // async getRoninBalance() {
  // }
  //
  // async compareBalance(balancePre:any, balanceCurrent:any):Promise<any> {
  //
  // }
  //
  // async pushData(){}
}
