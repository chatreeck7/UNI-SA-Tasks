#!/usr/bin/env node

// Import dependencies
const { createLogger, format, transports } = require("winston");
require("dotenv").config({ path: `../.env` });
const {
  connectToRabbitMQ,
  createChannel,
  handleTermination,
} = require("../client/rabbitmq");

const logger = createLogger({
  level: "debug",
  format: format.combine(
    format.colorize(),
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [new transports.Console()],
});

const foodType = ["Italian", "Japanese", "Chinese", "Thai", "Indian"];
const kitchenCookableFood = [
  ["Italian"],
  ["Japanese", "Chinese"],
  ["Japanese", "Thai", "Indian"],
  foodType,
];

// Consune message from a queue
function consumeMessage(channel, queue) {
  return new Promise((resolve, reject) => {
    channel.prefetch(1);
    channel.consume(
      queue,
      (msg) => {
        const secs = msg.content.toString().split(".").length - 1;
        logger.info(" [x] Received");
        logger.info(msg.content);

        setTimeout(function () {
          logger.info(" [x] Done");
          channel.ack(msg);
        }, secs * 1000);
      },
      {
        noAck: false,
      }
    );
    resolve();
  });
}

async function startConsumer(url, kitchenId, cookableFood) {
  try {
    const connection = await connectToRabbitMQ(url);
    const channel = await createChannel(connection);

    logger.debug(`Consumer RabbitMQ connection: ${connection}`);

    const exchange = "order_exchange";
    channel.assertExchange(exchange, "direct", {
      durable: true,
    });

    const queue = `kitchen_${kitchenId}`;
    await channel.assertQueue(queue, {
      durable: true,
    });

    const routingKeys = cookableFood.filter((type) => foodType.includes(type));
    routingKeys.forEach((key) => {
      channel.bindQueue(queue, exchange, key);
    });

    await consumeMessage(channel, queue);
    logger.info(
      `[*] Kitchen ${kitchenId} is ready to process orders: ${routingKeys.join(
        ", "
      )}`
    );

    handleTermination(channel, connection);
  } catch (err) {
    logger.error(`An error occured: ${err.message}`);
  }
}

const url = process.env.CLOUDAMQP_URL || "amqp://localhost";
logger.info(`Connecting to RabbitMQ at ${url}...`);

startConsumer(url, 1, kitchenCookableFood[0]);
startConsumer(url, 2, kitchenCookableFood[1]);
startConsumer(url, 3, kitchenCookableFood[2]);
startConsumer(url, 4, kitchenCookableFood[3]);
