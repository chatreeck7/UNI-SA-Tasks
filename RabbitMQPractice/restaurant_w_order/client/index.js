const client = require("./client");
const { Kafka } = require("kafkajs");
require("dotenv").config({ path: `../.env` });

const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const rabbitmq = require("./rabbitmq");
const url = process.env.CLOUDAMQP_URL || "amqp://localhost";

const app = express();

const orderProvider = new Kafka({
  clientId: "order_provider",
  brokers: ["127.0.0.1:9092"],
  retry: undefined,
  connectionTimeout: 60000,
});

const producer = orderProvider.producer({});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  client.getAllMenu(null, (err, data) => {
    if (!err) {
      res.render("menu", {
        results: data.menu,
      });
    }
  });
});

app.post("/placeorder", async (req, res) => {
  const orderItem = {
    id: req.body.id,
    name: req.body.name,
    type: req.body.type,
    quantity: req.body.quantity,
  };
  try {
    await rabbitmq.publishOrderToKitchens(url, orderItem);
  } catch (error) {
    res.status(500).send("Failed to place order.");
  }
});

app.post("/placeorder-kafka", async (req, res) => {
  const orderItem = {
    id: req.body.id,
    name: req.body.name,
    quantity: req.body.quantity,
  };

  await producer.connect();
  const _res = await producer.send({
    topic: req.body.type,
    messages: [{ value: JSON.stringify(orderItem) }],
  });

  console.log(_res);

  res.status(201).json({ message: "Order placed successfully" });
  console.log("[x] Sent '%s' to topic '%s'", orderItem, req.body.type);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running at port %d", PORT);
});
