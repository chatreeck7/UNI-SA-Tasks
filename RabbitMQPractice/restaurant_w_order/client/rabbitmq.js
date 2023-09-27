require("dotenv").config({ path: `../.env` });
const process = require("process");
const amqp = require("amqplib/callback_api");
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

// Handle process termination
function handleTermination(channel, connection) {
  process.on("SIGINT", function () {
    logger.info("Received SIGINT. Closing channel and connection...");
    channel.close();
    connection.close();
    process.exit(0);
  });
}

async function publishOrderToKitchens(url, orderItem) {
  try {
    const connection = await connectToRabbitMQ(url);
    const channel = await createChannel(connection);

    logger.info(`Connecting to RabbitMQ at ${url}...`);

    logger.debug(`Publisher RabbitMQ connection: ${connection}`);

    const exchange = "order_exchange";
    const routingKeys = ["Italian", "Japanese", "Chinese", "Thai", "Indian"];

    channel.assertExchange(exchange, "direct", {
      durable: true,
    });

    routingKeys.forEach((key) => {
      channel.publish(exchange, key, Buffer.from(JSON.stringify(orderItem)), {
        persistent: true,
      });
      console.log(` [x] Sent order for ${key}:`, orderItem);
    });
    
    handleTermination(channel, connection);
  } catch (err) {
    logger.error(`An error occured: ${err.message}`);
  }
}

module.exports = {
  publishOrderToKitchens,
  connectToRabbitMQ,
  createChannel,
  handleTermination,
};
