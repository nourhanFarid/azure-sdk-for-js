# Azure Service Bus client library for Javascript (Preview)

[Azure Service Bus](https://azure.microsoft.com/en-us/services/service-bus/) is a highly-reliable cloud messaging service from Microsoft.

Use the client library `@azure/service-bus` in your application to

- Send messages to an Azure Service Bus Queue or Topic
- Receive messages from an Azure Service Bus Queue or Subscription
- Manage Subscription rules

Resources for the v7.0.0-preview.1 of `@azure/service-bus`:

[Source code](https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/servicebus/service-bus) |
[Package (npm)](https://www.npmjs.com/package/@azure/service-bus) |
[API Reference Documentation][apiref] |
[Product documentation](https://azure.microsoft.com/en-us/services/service-bus/) |
[Samples](https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/servicebus/service-bus/samples)

> **NOTE**: This document has instructions, links and code snippets for the **preview** of the next version of the `@azure/service-bus` package
> which has different APIs than the stable version. To use the stable version of the library use the below resources.

[Source code or Readme for v1.1.5](https://github.com/Azure/azure-sdk-for-js/tree/%40azure/service-bus_1.1.5/sdk/servicebus/service-bus) |
[Package for v1.1.5 (npm)](https://www.npmjs.com/package/@azure/service-bus/v/1.1.5) |
[API Reference Documentation for v1.1.5](https://docs.microsoft.com/en-us/javascript/api/%40azure/service-bus/?view=azure-node-latest) |
[Samples for v1.1.5](https://github.com/Azure/azure-sdk-for-js/tree/%40azure/service-bus_1.1.5/sdk/servicebus/service-bus/samples)

## Getting Started

### Install the package

Install the preview version for the Azure Service Bus client library using npm

`npm install @azure/service-bus@next`

### Prerequisites

You must have an [Azure subscription](https://azure.microsoft.com/free/) and a
[Service Bus Namespace](https://docs.microsoft.com/en-us/azure/service-bus-messaging/) to use this package.
If you are using this package in a Node.js application, then use Node.js 8.x or higher.

### Configure Typescript

TypeScript users need to have Node type definitions installed:

```bash
npm install @types/node
```

You also need to enable `compilerOptions.allowSyntheticDefaultImports` in your tsconfig.json. Note that if you have enabled `compilerOptions.esModuleInterop`, `allowSyntheticDefaultImports` is enabled by default. See [TypeScript's compiler options handbook](https://www.typescriptlang.org/docs/handbook/compiler-options.html) for more information.

### Authenticate the client

Interaction with Service Bus starts with an instance of the [ServiceBusClient][sbclient] class.

You can instantiate this class using its constructors:

- [Create using a connection string][sbclient_constructor]
  - This method takes the connection string to your Service Bus instance. You can get the connection string
    from the Azure portal.
- [Create using a TokenCredential][sbclient_constructor]
  - This method takes the host name of your Service Bus instance and a credentials object that you need
    to generate using the [@azure/identity](https://www.npmjs.com/package/@azure/identity)
    library. The host name is of the format `name-of-service-bus-instance.servicebus.windows.net`.

### Key concepts

Once you have initialized the [ServiceBusClient][sbclient] class you will be able to:

- Send messages, to a queue or topic, using a [`Sender`][sender] created using [`ServiceBusClient.getSender()`][sbclient_getsender].
- Receive messages, from either a queue or a subscription, using a [`Receiver`][receiver] created using [`ServiceBusClient.getReceiver()`][sbclient_getreceiver].
- Receive messages, from session enabled queues or subscriptions, using a [`SessionReceiver`][sessionreceiver] created using [`ServiceBusClient.getSessionReceiver()`][sbclient_getsessionreceiver].

Please note that the Queues, Topics and Subscriptions should be created prior to using this library.

### Examples

The following sections provide code snippets that cover some of the common tasks using Azure Service Bus

- [Send messages](#send-messages)
- [Receive messages](#receive-messages)
- [Settle a message](#settle-a-message)
- [Send messages using Sessions](#send-messages-using-sessions)
- [Receive messages using Sessions](#receive-messages-using-sessions)

### Send messages

Once you have created an instance of a `ServiceBusClient` class, you can get a `Sender`
using the [getSender][sbclient_getsender] method.

This gives you a sender which you can use to [send][sender_send] messages.

You can also use the [sendBatch][sender_sendbatch]
method to efficiently send multiple messages in a single send.

```javascript
const sender = serviceBusClient.getSender("my-queue");
await sender.send({
  body: "my-message-body"
});

const batch = await sender.createBatch();

// NOTE: tryAdd() returns false if the message could not
// be added because the batch is at capacity.
batch.tryAdd({ body: "my-message-body-1" });
batch.tryAdd({ body: "my-message-body-2" });
batch.tryAdd({ body: "my-message-body-3" });

await sender.sendBatch(batch);
```

### Receive messages

Once you have created an instance of a `ServiceBusClient` class, you can get a `Receiver`
using the [getReceiver][sbclient_getreceiver] function.

```javascript
const receiver = serviceBusClient.getReceiver("my-queue", "peekLock");
```

You can use this receiver in one of 3 ways to receive messages:

#### Get an array of messages

Use the [receiveBatch][receiverreceivebatch] function which returns a promise that
resolves to an array of messages.

```javascript
const myMessages = await receiver.receiveBatch(10);
```

#### Subscribe using a message handler

Use the [subscribe][receiver_subscribe] method to set up message handlers and have
it running as long as you need.

When you are done, call `receiver.close()` to stop receiving any more messages.

```javascript
const myMessageHandler = async (message) => {
  // your code here
};
const myErrorHandler = async (error) => {
  console.log(error);
};
receiver.subscribe({
  processMessage: myMessageHandler,
  processError: myErrorHandler
});
```

#### Use async iterator

Use the [getMessageIterator][receiver_getmessageiterator] to get an async iterator over messages

```javascript
for await (let message of receiver.getMessageIterator()) {
  // your code here
}
```

### Settle a message

Once you receive a message you can call `complete()`, `abandon()`, `defer()` or `deadletter()` on it
based on how you want to settle the message.

To learn more, please read [Settling Received Messages](https://docs.microsoft.com/en-us/azure/service-bus-messaging/message-transfers-locks-settlement#settling-receive-operations)

### Send messages using Sessions

To send messages using sessions, you first need to create a session enabled Queue or Subscription. You can do this
in the Azure portal. Then, use an instance of a `ServiceBusClient` to create a sender using the using
the [getSender][sbclient_getsender]
function. This gives you a sender which you can use to [send][sender_send] messages.

When sending the message, set the `sessionId` property in the message body to ensure your message
lands in the right session.

```javascript
const sender = serviceBusClient.getSender("my-session-queue");
await sender.send({
  body: "my-message-body",
  sessionId: "my-session"
});
```

### Receive messages from Sessions

To receive messages from sessions, you first need to create a session enabled Queue and send messages
to it. Then, use an instance of `ServiceBusClient` to create a receiver
using the [getSessionReceiver][sbclient_getsessionreceiver] function.

Note that you will need to specify the session from which you want to receive messages.

```javascript
const receiver = serviceBusClient.getSessionReceiver("my-session-queue", "peekLock", {
  sessionId: "my-session"
});
```

You can use this receiver in one of 3 ways to receive messages

- [Get an array of messages](#get-an-array-of-messages)
- [Subscribe using a message handler](#subscribe-using-a-message-handler)
- [Use async iterator](#use-async-iterator)

## Troubleshooting

## AMQP Dependencies

The Service Bus library depends on the [rhea-promise](https://github.com/amqp/rhea-promise) library for managing connections, sending and receiving messages over the [AMQP](http://docs.oasis-open.org/amqp/core/v1.0/os/amqp-core-complete-v1.0-os.pdf) protocol.

### Enable logs

You can set the following environment variable to get the debug logs when using this library.

- Getting debug logs from the Service Bus SDK

```bash
export DEBUG=azure*
```

- Getting debug logs from the Service Bus SDK and the protocol level library.

```bash
export DEBUG=azure*,rhea*
```

- If you are **not interested in viewing the message transformation** (which consumes lot of console/disk space) then you can set the `DEBUG` environment variable as follows:

```bash
export DEBUG=azure*,rhea*,-rhea:raw,-rhea:message,-azure:core-amqp:datatransformer
```

- If you are interested only in **errors**, then you can set the `DEBUG` environment variable as follows:

```bash
export DEBUG=azure:service-bus:error,azure-core-amqp:error,rhea-promise:error,rhea:events,rhea:frames,rhea:io,rhea:flow
```

### Logging to a file

1. Set the `DEBUG` environment variable as shown above
2. Run your test script as follows:

- Logging statements from your test script go to `out.log` and logging statements from the sdk go to `debug.log`.
  ```bash
  node your-test-script.js > out.log 2>debug.log
  ```
- Logging statements from your test script and the sdk go to the same file `out.log` by redirecting stderr to stdout (&1), and then redirect stdout to a file:
  ```bash
  node your-test-script.js >out.log 2>&1
  ```
- Logging statements from your test script and the sdk go to the same file `out.log`.
  ```bash
    node your-test-script.js &> out.log
  ```

## Next Steps

Please take a look at the [samples](https://github.com/Azure/azure-sdk-for-js/tree/master/sdk/servicebus/service-bus/samples)
directory for detailed examples on how to use this library to send and receive messages to/from
[Service Bus Queues, Topics and Subscriptions](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview).

## Contributing

If you'd like to contribute to this library, please read the [contributing guide](../../../CONTRIBUTING.md) to learn more about how to build and test the code.

![Impressions](https://azure-sdk-impressions.azurewebsites.net/api/impressions/azure-sdk-for-js%2Fsdk%2Fservicebus%2Fservice-bus%2FREADME.png)

[apiref]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/index.html
[sbclient]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/classes/servicebusclient.html
[sbclient_constructor]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/classes/servicebusclient.html#constructor
[sbclient_getsender]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/classes/servicebusclient.html#getsender
[sbclient_getreceiver]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/classes/servicebusclient.html#getreceiver
[sbclient_getsessionreceiver]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/classes/servicebusclient.html#getsessionreceiver
[sender]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/interfaces/sender.html
[sender_send]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/interfaces/sender.html#send
[sender_sendbatch]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/interfaces/sender.html#sendbatch
[receiver]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/interfaces/receiver.html
[receiverreceivebatch]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/interfaces/receiver.html#receivebatch
[receiver_subscribe]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/interfaces/receiver.html#subscribe
[receiver_getmessageiterator]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/interfaces/receiver.html#getmessageiterator
[sessionreceiver]: https://azuresdkdocs.blob.core.windows.net/$web/javascript/azure-service-bus/7.0.0-preview.1/interfaces/sessionreceiver.html
