# Communication Patterns in Backend - Scalability and Reliability - Comprehensive Guide

Message exchange patterns fall into two big categories:

- Request/Response (point-to-point)
- Event / Stream / Broadcast (decoupled)

Let's uncover the patterns of how to exchange either of them:

## Request/Response - Point to Point

These require receiver to be alive all the time:

- Direct Communication (HTTP/REST)
- Server Sent Events (SSE)
- WebSocket

### Direct Communication (Tight Coupling)

- In most situations these are HTTP/REST, synchronous and are mostly used for API requests. Probably the most common micro-service pattern.
- Some scenarios use gRPC that uses `Protobuf` and is smaller latency that HTTP.

While useful fore most situations, it is not designed for server -> client sending messages. Some workarounds can be done like [HTTP Polling](https://ably.com/topic/long-polling) where the client sends periodic HTTP requests (every `x` seconds or so). This makes it feel like bidirectional communication when in practice it is not. There are Short and Long Polling. Both are widely used and have their applications.

#### Short Polling

- Short Polling is when the client sends requests and server replies immediately.
- The result is many empty requests, with no effect, because many times server might not have new data

#### Long Polling

- Long Polling is when the client sends a request, and server holds it open until the new data is available or the timeout is reached.
- In practice it means less requests that short polling so more efficient for some cases

### Server Sent Events (SSE)

[Server sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) enable Server -> Client streaming.

- Under the hood it is one long-liver HTTP connection
- Is a good option if we need server to send periodic feeds or notifications.

### WebSocket

[WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) open a full bi-directional communication session between client and a server.

- It uses persistent TCP connection
- Is good for real time apps

### Webhooks

The other way of the server sending request back to the client is using webhooks. This is a lightweight alternative to SSE or WebSocket. Essentially the client sends a simple HTTP request in a fire-and-forget mode, but the client also provides an async callback URL - also known as Webhook URL. When server finishes its work, it will use the callback URL.

- It is truly async in a way that there is no need to keep open HTTP/TCP connection between client and the server
- It is harder to ensure the guarantee of message delivery from server to client. Although usually reties can be made.

### SSE vs Websockets vs Webhooks

| Feature            | SSE             | WebSocket      | Webhook                  |
| ------------------ | --------------- | -------------- | ------------------------ |
| Direction          | Server → Client | Bi-directional | Server → Server          |
| Connection         | Persistent      | Persistent     | No persistent connection |
| Real-time          | Yes             | Yes            | No (async callback)      |
| Delivery guarantee | Weak            | Weak           | Can be retried           |

### SSE vs Websockets vs Webhooks reliability guarantee

Counter intuitively it might feel that websockets/SSE are more relible because they hold a direct connection, whereas webhooks are fire-and-forget so it is unknown what will happen after the "forget" moment. But reliability is about what happens if something breaks. So assuming nothing breaks, they all make the same feel - a client receives the message (although with different styles).

Despite having live connection, if client disconnects, server restarts or network fails then the message is gone because there is no persistence, retry or delivery tracking. These are "At most once" delivery guarantees. The same happens with Webhook. If we implement a bare webhook url and callback url, the message might be lost in event of failure.

| Method    | Default Guarantee |
| --------- | ----------------- |
| SSE       | At-most-once      |
| WebSocket | At-most-once      |
| Webhook   | At-most-once      |

So reliability is not free. But we will talk about that later down the line

## Broadcast - From one to many

The single drawback of point to point connections like sse or websockets is that they don't scale. Single server will have too much overhead if it has to send the message 1:1 to millions of connections. Now lets talk about when multiple servers or clients need to have access to the new message. The naive approach would be sending request to multiple servers, but it is not that simple because the client needs to know which servers care about the message, and it surely shouldn't send it to all of them as this would be highly ineficient. Let's see what methods exist.

### Naive Polling from the Servers to Database

The simplest method would be use polling the database. Why database? Because most simple systems already have one, so probably no need to change nothing in the infrastructure.

- Multiple servers poll a database to see if there is new message for that client
- The client writes to a database
- If something changed in a database, the servers will all receive the message

```sh
Client → HTTP POST messages → DB
Server → DB → return messages
```

This approach is good for tiny systems or very low frequency updates, it is easy to implement and reason about. However it is poor for many servers, and there is alot of wasted requests. With many messages and servers, the database will get too much load on it.

### Server-Side push via Polling / Pub-Sub

The naive approach above allowed us to reason about how to broadcast the message - using centralized entity that is queried by all interested parties. We used a database, but what if we use a dedicated server to hold this logic? In such a way we start to have interesting patterns emerging and a possibility for Server to push notifications or Server Sent Events:

1. Setup a dedicated server - message broker.
2. Clients write to the central place (broker) instead of DB
3. Servers can subscribe to the relevant messages.
4. Broker can keep open connections or keep registry if servers and send events

```sh
Client → Broker (publish message)
Server A/B/C → Broker (subscribe to channel) → receive messages
```

Some benefits of this approach

- This reduces database load but at the expense of adding new component in the system.
- no need for polling, broker sends messages

There are some drawbacks though:

- The reliability depends on the broker - if it crashes, lots of messages will be lost
- We must manage the subscription logic

### Redis Publish/Subscribe

What we have described above is very similar to what Redis Publish/Subscribe does. Redis acts as an in-memory broker

- Clients (or servers) subscribe to one or more channels
- Publishers send messages to a channel
- Redis delivers the message to all subscribers immediately

Under the hood, Redis keeps the list of connected (subscribed) processes, and when the message is published, Redis retrieves the subscribed connections and pushes the message to them via TPC socket. We can ensure that Redis have better resiliency by making a cluster of brokers. However, assuming that the broker reliability is good, by design Redis is an in-memory store and doesn't store messages in a persistent storage. This means that:

- If the subscriber is disconnected, and broker publishes, the message will be lost
- There is no replay because messages are not stored nowhere.

So in a way, a simple Database polling gives us better guarantees of delivery. Yet Redis might be better choice due to better scalability - more servers can subscribe.

### Kafka Distributed Log

When the number of subscribers, messages, or servers grows beyond what in-memory Pub/Sub can handle, we need a durable, horizontally scalable, replayable system. An example of such system is what we call a distributed log. Here is how it works:

- Producers write messages once to a partitioned, durable log - usually append-only file on disk
- Multiple consumers read the log independently. Usually using long polling.
- Consumers track their offsets so they can replay messages if needed
- Messages are persisted to disk so they are not lost if subscribers disconnect

```sh
Producer → Kafka Topic
Server Group A → consume topic independently
Server Group B → consume topic independently
```

Kafka is a notable example of such a system. It provides many benefits over Redis Pub/Sub

1. Better Guarantees of Delivery - on disk messages allow replay of messages.
2. Improved Scalability - scales horizontally with partitions. Producers don't write all in one place, but in their own producer group. Using long polling, one write ensures that thousands independend consumers will receive a message
3. Guarantees at-least-one delivery, but also possible to use exactly-once delivery

Kafka is the best guarantee and scalability for message broadcast. It is however also the most complex to manage operationally

### Comparison - DB vs Redis Pub/Sub vs Kafka Distributed Log

| Layer                 | Delivery      | Persistence | Replay | Scale  | Complexity |
| --------------------- | ------------- | ----------- | ------ | ------ | ---------- |
| DB Polling            | At-least-once | Yes         | Yes    | Poor   | Very low   |
| Redis Pub/Sub         | At-most-once  | No          | No     | Medium | Low        |
| Redis Streams / Kafka | At-least-once | Yes         | Yes    | High   | High       |

## Improving Reliability of point to point connections - Webhooks

We have observed that all point to point connections provide at-most-once delivery

| Method    | Default Guarantee |
| --------- | ----------------- |
| SSE       | At-most-once      |
| WebSocket | At-most-once      |
| Webhook   | At-most-once      |

Let's inspect how to improve that, and go for at-most-once to at-least-once in one of them. We will talk about Webhooks.

### Raw Webhooks

With raw webhooks the flowis:

1. a server callback `POST` to a callback URL
2. If the request fails (network, server down) - the message is lost
3. No retries or persistence by default

### Webhooks and Background Tasks/Workers

In some specific situations in point to point communication - webhooks and callback URLs allow the client to delegate to the server some work and the server will send message back after some time. The server in this scenario might keep an open connection with the client - which would be blocking - execute task and call webhook.

In other scenario, a server would rather spawn a worker, close the connection and delegate task execution to the background worker. In that scenario there are two failure modes:

1. The Background Worker might fail to invoke webhook - and we might have to respawn another worker to retry
2. The Background Worker might succeed to invoke webhook - but Webhook is not working for some reason - returns failed request.

Let's inspect each of them individually:

#### Background Worker Failure Resiliency

**Scenario**: a server spawns a background worker to handle task but the worker crashes, is killed or fails before it can call the webhook.

**Effect**: The webhook event is never sent. If no persistence exists, message is lost.

**Solution 1**: The simplest is using the supervisor:

1. Retry and Supervisor - a process manager that spawns workers can detect crashed workers and automatically restart them. Supervisor can detect failures using process exit codes, hearbeat, ttl etc.

Notice that due to lack of persistence, if the supervisor server crashes, then the message will be lost. We can assume that the server is stable, so this solution is good enough. Here we guarantee at-least-once delivery unless the whole server dies.

**Solution 2**: supervisor + persistent store for improved idempotency.

1. Retry and Supervisor - same as above - ensure crashed workers are respawned
2. Task Store - When the server spawns a worker, it writes/reads the event to a durable queue (e.g. Kafka). The worker reads from the queue and executes the task. If worker fails, then another worker can retry, because the message is still in the queue. In specific, a worker can read `TaskState.working|submitted` - means it has to execute it. Otherwise it will be in `TaskState.completed|failed`.

This solution is more complex but gives stronger reliability gurarantees - it survives worker failures and server restarts unlike solution 1. Both solutions **assume idempotency** - unfinished tasks are idempotent so they can be retried without side-effects.

| Feature               | Supervisor only                       | Supervisor + Persistent Queue   |
| --------------------- | ------------------------------------- | ------------------------------- |
| Survives worker crash | ✅                                    | ✅                              |
| Survives server crash | ❌                                    | ✅                              |
| Task replay           | Only if worker restarts               | Explicit — via queue/task state |
| Delivery guarantee    | Best-effort / at-least-once in memory | At-least-once durable           |
| Complexity            | Low                                   | Medium / high                   |
| Infrastructure needed | Supervisor                            | Queue / task store + supervisor |

**Delivery guarantees**:

| Solution                      | At-least-once?             | Notes                                                           |
| ----------------------------- | -------------------------- | --------------------------------------------------------------- |
| Supervisor only               | ✅ in memory (best-effort) | If server crashes, message is lost; assumes server is stable    |
| Supervisor + Persistent Queue | ✅ durable                 | Survives worker crashes and server restarts; stronger guarantee |

#### Webhook Failure Resiliency

**Scenario**: Worker executes tasks successfully and runs a POST to a callback URL. The remote server responds with error (network timeout, 5xx, unreachable)

**Effect**: The worker succeeds locally, but overall system is not aware unless webhook URL is invoked. The client never receives the callback.

**Solution**: The solution could use a retry mechanism with exponential backoff and idempotent webhooks and dead-letter queue DLQ:

1. Worker retries webhook POST if HTTP response is != 2xx. Can implement max retry count and backoff time
2. Ensure that webhooks can be invoked more than once without side-effects
3. If max retries is reached, then nothing can be done, and so we can send broken message to DLQ for debugging.

#### Webhook and async client - client perspective in worse-case scenario

**In worse case scenario**: if after all the retries client cannot get a webhook callback after, the client has to setup a proper response to the user. For example, a client that expects async response at webhook, might set a "running time budget". In practice it is a timeout when to consider the response from webhook is lost.

**Solution**:

1. Client defines a timeout when making the async request.
2. If webhook callback does not arrive within this time, client assumes failure or triggers fallback logic.

**Flow example**:

```sh
Client → Async request → Server spawns worker → Server closes HTTP connection
Client → Starts timer for time budget (e.g., 30s)
Worker → Executes task → Attempts webhook delivery with retries
Webhook succeeds before timeout → client handles response normally
Webhook fails or arrives after client timer expires → client treats as lost
```

#### Summary table of All Failure Modes

| Failure Mode                                         | Cause                   | Solution                                 | At-least-once?           |
| ---------------------------------------------------- | ----------------------- | ---------------------------------------- | ------------------------ |
| Worker fails before sending webhook                  | Crash, restart          | Supervisor / persistent queue            | Yes (durable with queue) |
| Worker succeeds, webhook fails                       | Network / endpoint      | Retry + idempotent webhook + dead-letter | Yes                      |
| Worker crashes after task success but before webhook | Worker crash            | Supervisor + persistent queue + retry    | Yes                      |
| Remote endpoint down                                 | Network, client offline | Retry + backoff + dead-letter            | Yes                      |
