#!/usr/bin/env node

// Import dependencies
const amqp = require("amqplib/callback_api");
const process = require("process");
const { createLogger, format, transports } = require("winston");

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

// Establish connection to RabbitMQ
function connectToRabbitMQ(url) {
  return new Promise((resolve, reject) => {
    amqp.connect(url, function (err, connection) {
      if (err) {
        reject(err);
      }
      resolve(connection);
    });
  });
}

// Create a channel
function createChannel(connection) {
  return new Promise((resolve, reject) => {
    connection.createChannel(function (err, channel) {
      if (err) {
        reject(err);
      }
      resolve(channel);
    });
  });
}

// Consune message from a queue
function consumeMessage(channel, queue) {
  return new Promise((resolve, reject) => {
    channel.prefetch(1);
    channel.consume(
      queue,
      (msg) => {
        const secs = msg.content.toString().split(".").length - 1;
        logger.info(" [x] Received");
        logger.info(JSON.parse(msg.content));

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

// Handle process termination
function handleTermination(channel, connection) {
  process.on("SIGINT", function () {
    logger.info("Received SIGINT. Closing channel and connection...");
    channel.close();
    connection.close();
    process.exit(0);
  });
}

async function startConsumer(url, kitchenId, cookableFood) {
  try {
    const connection = await connectToRabbitMQ(url);
    const channel = await createChannel(connection);

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
  process.exit(1);
}

const url = process.env.CLOUDAMQP_URL || "amqp://localhost";
logger.info(`Connecting to RabbitMQ at ${url}...`);

for (let i = 0; i < kitchenCookableFood.length; i++) {
  startConsumer(url, i, kitchenCookableFood[i]);
}
