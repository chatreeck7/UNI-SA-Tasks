const client = require("./client");
require("dotenv").config({ path: `../.env` });

const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const rabbitmq = require("./rabbitmq");
const url = process.env.CLOUDAMQP_URL || "amqp://localhost";

const app = express();

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
    quantity: req.body.quantity,
  };
  try {
    await rabbitmq.publishOrderToKitchens(url, orderItem);
  } catch (error) {
    res.status(500).send("Failed to place order.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running at port %d", PORT);
});
