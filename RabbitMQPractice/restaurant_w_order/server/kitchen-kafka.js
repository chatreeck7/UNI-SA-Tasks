const process = require('process');
const { Kafka } = require("kafkajs");

const argv = process.argv

argv.splice(0, 2)

const orderConsumer = new Kafka({
  clientId: "order_consumer",
  brokers: ["localhost:9092"],
  connectionTimeout: 60000,
})


const consumer = orderConsumer.consumer({
  groupId: `order-consumer-${argv.join('-')}`,
})

const run = async () => {
  await consumer.connect()
  await consumer.subscribe({ fromBeginning: true, topics: argv })
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        partition,
        offset: message.offset,
        value: message.value.toString(),
      })
    },
  })
}

run().catch(console.error)