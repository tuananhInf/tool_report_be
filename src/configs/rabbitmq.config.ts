export const rabbitmqConfig = {
  uri: process.env.RABBITMQ_URI,
  queue: process.env.RABBITMQ_QUEUE,
  exchange: process.env.RABBITMQ_EXCHANGE,
  routingKey: process.env.RABBITMQ_ROUTING_KEY,
  messageTtl: parseInt(process.env.RABBITMQ_MESSAGE_TTL),
};
