// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { generate_uuid } from "rhea-promise";
import { isTokenCredential, TokenCredential } from "@azure/core-amqp";
import {
  ServiceBusClientOptions,
  createConnectionContextForTokenCredential,
  createConnectionContextForConnectionString
} from "./constructorHelpers";
import { ConnectionContext } from "./connectionContext";
import { ClientEntityContext } from "./clientEntityContext";
import { ClientType } from "./client";
import { SenderImpl, Sender } from "./sender";
import {
  GetSessionReceiverOptions,
  GetReceiverOptions,
  GetSenderOptions,
  GetSubscriptionRuleManagerOptions
} from "./models";
import { Receiver, ReceiverImpl } from "./receivers/receiver";
import { SessionReceiver, SessionReceiverImpl } from "./receivers/sessionReceiver";
import { ReceivedMessageWithLock, ReceivedMessage } from "./serviceBusMessage";
import {
  SubscriptionRuleManagerImpl,
  SubscriptionRuleManager
} from "./receivers/subscriptionRuleManager";

/**
 * A client that can create Sender instances for sending messages to queues and
 * topics as well as Receiver instances to receive messages from queues and subscriptions.
 */
export class ServiceBusClient {
  private _connectionContext: ConnectionContext;
  private _clientOptions: ServiceBusClientOptions;

  /**
   *
   * @param connectionString A connection string for Azure Service Bus.
   * NOTE: this connection string can contain an EntityPath, which is ignored.
   * @param options Options for the service bus client.
   */
  constructor(connectionString: string, options?: ServiceBusClientOptions);
  /**
   *
   * @param host The hostname of your Azure Service Bus.
   * @param tokenCredential A valid TokenCredential for Service Bus or a
   * Service Bus entity.
   * @param options Options for the service bus client.
   */
  constructor(
    hostName: string,
    tokenCredential: TokenCredential,
    options?: ServiceBusClientOptions
  );
  constructor(
    connectionStringOrHostName1: string,
    tokenCredentialOrServiceBusOptions2?: TokenCredential | ServiceBusClientOptions,
    options3?: ServiceBusClientOptions
  ) {
    if (isTokenCredential(tokenCredentialOrServiceBusOptions2)) {
      const hostName: string = connectionStringOrHostName1;
      const tokenCredential: TokenCredential = tokenCredentialOrServiceBusOptions2;
      this._clientOptions = options3 || {};

      this._connectionContext = createConnectionContextForTokenCredential(
        tokenCredential,
        hostName,
        this._clientOptions
      );
    } else {
      const connectionString: string = connectionStringOrHostName1;
      this._clientOptions = tokenCredentialOrServiceBusOptions2 || {};

      this._connectionContext = createConnectionContextForConnectionString(
        connectionString,
        this._clientOptions
      );
    }
  }

  /**
   * Creates a receiver for an Azure Service Bus queue.
   *
   * @param queueName The name of the queue to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getReceiver(
    queueName: string,
    receiveMode: "peekLock",
    options?: GetReceiverOptions
  ): Receiver<ReceivedMessageWithLock>;
  /**
   * Creates a receiver for an Azure Service Bus queue.
   *
   * @param queueName The name of the queue to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getReceiver(
    queueName: string,
    receiveMode: "receiveAndDelete",
    options?: GetReceiverOptions
  ): Receiver<ReceivedMessage>;
  /**
   * Creates a receiver for an Azure Service Bus subscription.
   *
   * @param topicName Name of the topic for the subscription we want to receive from.
   * @param subscriptionName Name of the subscription (under the `topic`) that we want to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getReceiver(
    topicName: string,
    subscriptionName: string,
    receiveMode: "peekLock",
    options?: GetReceiverOptions
  ): Receiver<ReceivedMessageWithLock>;
  /**
   * Creates a receiver for an Azure Service Bus subscription.
   *
   * @param topicName Name of the topic for the subscription we want to receive from.
   * @param subscriptionName Name of the subscription (under the `topic`) that we want to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getReceiver(
    topicName: string,
    subscriptionName: string,
    receiveMode: "receiveAndDelete",
    options?: GetReceiverOptions
  ): Receiver<ReceivedMessage>;
  getReceiver(
    queueOrTopicName1: string,
    receiveModeOrSubscriptionName2: "peekLock" | "receiveAndDelete" | string,
    receiveModeOrOptions3?: "peekLock" | "receiveAndDelete" | GetReceiverOptions,
    options4?: GetReceiverOptions
  ): Receiver<ReceivedMessageWithLock> | Receiver<ReceivedMessage> {
    // NOTE: we don't currently have any options for this kind of receiver but
    // when we do make sure you pass them in and extract them.
    const { entityPath, receiveMode, options } = extractReceiverArguments(
      this._connectionContext.config.entityPath,
      queueOrTopicName1,
      receiveModeOrSubscriptionName2,
      receiveModeOrOptions3,
      options4
    );

    const clientEntityContext = ClientEntityContext.create(
      entityPath,
      ClientType.ServiceBusReceiverClient,
      this._connectionContext,
      `${entityPath}/${generate_uuid()}`
    );

    if (receiveMode === "peekLock") {
      return new ReceiverImpl<ReceivedMessageWithLock>(clientEntityContext, receiveMode, {
        ...options,
        retryOptions: options?.retryOptions ?? this._clientOptions.retryOptions
      });
    } else {
      return new ReceiverImpl<ReceivedMessage>(clientEntityContext, receiveMode, {
        ...options,
        retryOptions: options?.retryOptions ?? this._clientOptions.retryOptions
      });
    }
  }

  /**
   * Creates a receiver for an Azure Service Bus queue.
   *
   * @param queueName The name of the queue to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getSessionReceiver(
    queueName: string,
    receiveMode: "peekLock",
    options?: GetSessionReceiverOptions
  ): SessionReceiver<ReceivedMessageWithLock>;
  /**
   * Creates a receiver for an Azure Service Bus queue.
   *
   * @param queueName The name of the queue to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getSessionReceiver(
    queueName: string,
    receiveMode: "receiveAndDelete",
    options?: GetSessionReceiverOptions
  ): SessionReceiver<ReceivedMessage>;
  /**
   * Creates a receiver for an Azure Service Bus subscription.
   *
   * @param topicName Name of the topic for the subscription we want to receive from.
   * @param subscriptionName Name of the subscription (under the `topic`) that we want to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getSessionReceiver(
    topicName: string,
    subscriptionName: string,
    receiveMode: "peekLock",
    options?: GetSessionReceiverOptions
  ): SessionReceiver<ReceivedMessageWithLock>;
  /**
   * Creates a receiver for an Azure Service Bus subscription.
   *
   * @param topicName Name of the topic for the subscription we want to receive from.
   * @param subscriptionName Name of the subscription (under the `topic`) that we want to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getSessionReceiver(
    topicName: string,
    subscriptionName: string,
    receiveMode: "receiveAndDelete",
    options?: GetSessionReceiverOptions
  ): SessionReceiver<ReceivedMessage>;
  getSessionReceiver(
    queueOrTopicName1: string,
    receiveModeOrSubscriptionName2: "peekLock" | "receiveAndDelete" | string,
    receiveModeOrOptions3?: "peekLock" | "receiveAndDelete" | GetSessionReceiverOptions,
    options4?: GetSessionReceiverOptions
  ): SessionReceiver<ReceivedMessage> | SessionReceiver<ReceivedMessageWithLock> {
    const { entityPath, receiveMode, options } = extractReceiverArguments(
      this._connectionContext.config.entityPath,
      queueOrTopicName1,
      receiveModeOrSubscriptionName2,
      receiveModeOrOptions3,
      options4
    );

    const clientEntityContext = ClientEntityContext.create(
      entityPath,
      ClientType.ServiceBusReceiverClient,
      this._connectionContext,
      `${entityPath}/${generate_uuid()}`
    );

    // TODO: .NET actually tries to open the session here so we'd need to be async for that.
    return new SessionReceiverImpl(clientEntityContext, receiveMode, {
      sessionId: options?.sessionId,
      maxSessionAutoRenewLockDurationInSeconds: options?.maxSessionAutoRenewLockDurationInSeconds,
      retryOptions: options?.retryOptions ?? this._clientOptions.retryOptions
    });
  }

  /**
   * Creates a Sender which can be used to send messages, schedule messages to be sent at a later time
   * and cancel such scheduled messages.
   */
  getSender(queueOrTopicName: string, options?: GetSenderOptions): Sender {
    validateEntityNamesMatch(this._connectionContext.config.entityPath, queueOrTopicName, "sender");

    const clientEntityContext = ClientEntityContext.create(
      queueOrTopicName,
      ClientType.ServiceBusReceiverClient,
      this._connectionContext,
      `${queueOrTopicName}/${generate_uuid()}`
    );
    return new SenderImpl(clientEntityContext, {
      ...options,
      retryOptions: options?.retryOptions ?? this._clientOptions.retryOptions
    });
  }

  /**
   * Gets a SubscriptionRuleManager, which allows you to manage Service Bus subscription rules.
   * More information about subscription rules can be found here: https://docs.microsoft.com/en-us/azure/service-bus-messaging/topic-filters
   * @param topic The topic for the subscription.
   * @param subscription The subscription.
   */
  getSubscriptionRuleManager(
    topic: string,
    subscription: string,
    options?: GetSubscriptionRuleManagerOptions
  ): SubscriptionRuleManager {
    const entityPath = `${topic}/Subscriptions/${subscription}`;
    const clientEntityContext = ClientEntityContext.create(
      entityPath,
      ClientType.ServiceBusReceiverClient, // TODO:what are these names for? We can make one for management client...
      this._connectionContext,
      `${entityPath}/${generate_uuid()}`
    );

    return new SubscriptionRuleManagerImpl(clientEntityContext, {
      ...options,
      retryOptions: options?.retryOptions ?? this._clientOptions.retryOptions
    });
  }

  /**
   * Creates a receiver for an Azure Service Bus queue's dead letter queue.
   *
   * @param queueName The name of the queue to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getDeadLetterReceiver(
    queueName: string,
    receiveMode: "peekLock",
    options?: GetReceiverOptions
  ): Receiver<ReceivedMessageWithLock>;
  /**
   * Creates a receiver for an Azure Service Bus queue's dead letter queue.
   *
   * @param queueName The name of the queue to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getDeadLetterReceiver(
    queueName: string,
    receiveMode: "receiveAndDelete",
    options?: GetReceiverOptions
  ): Receiver<ReceivedMessage>;
  /**
   * Creates a receiver for an Azure Service Bus subscription's dead letter queue.
   *
   * @param topicName Name of the topic for the subscription we want to receive from.
   * @param subscriptionName Name of the subscription (under the `topic`) that we want to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getDeadLetterReceiver(
    topicName: string,
    subscriptionName: string,
    receiveMode: "peekLock",
    options?: GetReceiverOptions
  ): Receiver<ReceivedMessageWithLock>;
  /**
   * Creates a receiver for an Azure Service Bus subscription's dead letter queue.
   *
   * @param topicName Name of the topic for the subscription we want to receive from.
   * @param subscriptionName Name of the subscription (under the `topic`) that we want to receive from.
   * @param receiveMode The receive mode to use (defaults to PeekLock)
   * @param options Options for the receiver itself.
   */
  getDeadLetterReceiver(
    topicName: string,
    subscriptionName: string,
    receiveMode: "receiveAndDelete",
    options?: GetReceiverOptions
  ): Receiver<ReceivedMessage>;
  getDeadLetterReceiver(
    queueOrTopicName1: string,
    receiveModeOrSubscriptionName2: "peekLock" | "receiveAndDelete" | string,
    receiveModeOrOptions3?: "peekLock" | "receiveAndDelete" | GetReceiverOptions,
    options4?: GetReceiverOptions
  ): Receiver<ReceivedMessageWithLock> | Receiver<ReceivedMessage> {
    // NOTE: we don't currently have any options for this kind of receiver but
    // when we do make sure you pass them in and extract them.
    const { entityPath, receiveMode, options } = extractReceiverArguments(
      this._connectionContext.config.entityPath,
      queueOrTopicName1,
      receiveModeOrSubscriptionName2,
      receiveModeOrOptions3,
      options4
    );

    const deadLetterEntityPath = `${entityPath}/$DeadLetterQueue`;

    if (receiveMode === "peekLock") {
      return this.getReceiver(deadLetterEntityPath, receiveMode, options);
    } else {
      return this.getReceiver(deadLetterEntityPath, receiveMode, options);
    }
  }

  /**
   * Closes the underlying AMQP connection.
   * NOTE: this will also disconnect any Receiver or Sender instances created from this
   * instance.
   */
  close(): Promise<void> {
    return ConnectionContext.close(this._connectionContext);
  }
}

function isReceiveMode(mode: any): mode is "peekLock" | "receiveAndDelete" {
  return mode && typeof mode === "string" && (mode === "peekLock" || mode === "receiveAndDelete");
}

/**
 * Helper to validate and extract the common arguments from both the get*Receiver() overloads that
 * have this pattern:
 *
 * queue, lockmode, options
 * topic, subscription, lockmode, options
 *
 * @internal
 * @ignore
 */
export function extractReceiverArguments<OptionsT>(
  connectionStringEntityName: string | undefined,
  queueOrTopicName1: string,
  receiveModeOrSubscriptionName2: "peekLock" | "receiveAndDelete" | string,
  receiveModeOrOptions3: "peekLock" | "receiveAndDelete" | OptionsT,
  definitelyOptions4: OptionsT
): {
  entityPath: string;
  receiveMode: "peekLock" | "receiveAndDelete";
  options?: OptionsT;
} {
  if (isReceiveMode(receiveModeOrOptions3)) {
    const topic = queueOrTopicName1;
    const subscription = receiveModeOrSubscriptionName2;

    validateEntityNamesMatch(connectionStringEntityName, topic, "receiver-topic");

    return {
      entityPath: `${topic}/Subscriptions/${subscription}`,
      receiveMode: receiveModeOrOptions3,
      options: definitelyOptions4
    };
  } else if (isReceiveMode(receiveModeOrSubscriptionName2)) {
    validateEntityNamesMatch(connectionStringEntityName, queueOrTopicName1, "receiver-queue");

    return {
      entityPath: queueOrTopicName1,
      receiveMode: receiveModeOrSubscriptionName2,
      options: receiveModeOrOptions3
    };
  } else {
    throw new TypeError("Invalid receiveMode provided");
  }
}

/**
 * @internal
 * @ignore
 */
export function validateEntityNamesMatch(
  connectionStringEntityName: string | undefined,
  queueOrTopicName: string,
  senderOrReceiverType: "receiver-topic" | "receiver-queue" | "sender"
) {
  if (!connectionStringEntityName) {
    return;
  }

  if (queueOrTopicName !== connectionStringEntityName) {
    let entityType;
    let senderOrReceiver;

    switch (senderOrReceiverType) {
      case "receiver-queue":
        entityType = "queue";
        senderOrReceiver = "Receiver";
        break;
      case "receiver-topic":
        entityType = "topic";
        senderOrReceiver = "Receiver";
        break;
      case "sender":
        entityType = "queue/topic";
        senderOrReceiver = "Sender";
        break;
    }

    throw new Error(
      `The connection string for this ServiceBusClient had an EntityPath of '${connectionStringEntityName}' which doesn't match the name of the ${entityType} for this ${senderOrReceiver} ('${queueOrTopicName}')`
    );
  }
}
