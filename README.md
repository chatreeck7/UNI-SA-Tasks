# UNI-SA-Tasks
Bundle of assignment for senior course about software architecture

# Run the project ?? 

## General
```
npm install
npm start in restaurant_w_order
```

## For our Publisher/Provider 
```
node <yourpath>/restaurant_w_order/client/index.js
```
> index.js is our provider ( kafka ) or other name is publisher ( rabbitMQ )

### Our API called 

- POST /placeorder
- POST /placeorder-kafka
both send as
```json
{
  "id": "",
  "name": "",
  "type": "",
  "quantity": ""
}
```

## For RabbitMQ

### Run your consumer
```
node <yourpath>/restaurant_w_order/server/kitchen.js
```

## For Kafka

### Compose up the container 
```
docker compose up -d --build
```
### Run your consumer

```
node <yourpath>/restaurant_w_order/server/kitchen-kafka.js
```

> work at node version : 16.20.1
