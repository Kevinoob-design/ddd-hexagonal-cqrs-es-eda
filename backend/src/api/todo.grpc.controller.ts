import { todo } from '../proto/generated/todo';

import {
  Controller,
  Inject,
  Injectable,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RpcException, GrpcMethod } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Metadata, ServerWritableStream } from '@grpc/grpc-js';
import { v4 as uuid } from 'uuid';
import * as jwtwebtoken from 'jsonwebtoken';
import {
  BUSES_TOKENS,
  NatsPubSubIntegrationEventsBus,
} from '@bitloops/bl-boilerplate-infra-nest-jetstream';
import {
  AsyncLocalStorageInterceptor,
  JwtGrpcAuthGuard,
} from '@bitloops/bl-boilerplate-infra-nest-auth-passport';
import { Infra, asyncLocalStorage } from '@bitloops/bl-boilerplate-core';
import { CorrelationIdInterceptor } from '@bitloops/bl-boilerplate-infra-telemetry';
import { AuthEnvironmentVariables } from '@src/config/auth.configuration';
import { Traceable } from '@bitloops/bl-boilerplate-infra-telemetry';

import { DeleteTodoCommand } from '@lib/bounded-contexts/todo/todo/commands/delete-todo.command';

import { UncompleteTodoCommand } from '@lib/bounded-contexts/todo/todo/commands/uncomplete-todo.command';

import { ModifyTodoTitleCommand } from '@lib/bounded-contexts/todo/todo/commands/modify-todo-title.command';

import { AddTodoCommand } from '@lib/bounded-contexts/todo/todo/commands/add-todo.command';

import { TodoAddedPubSubIntegrationEventHandler } from './pub-sub-handlers/todo-added.integration-handler';
import { TodoModifiedTitlePubSubIntegrationEventHandler } from './pub-sub-handlers/todo-modified-title.integration-handler';
import { TodoDeletedPubSubIntegrationEventHandler } from './pub-sub-handlers/todo-deleted.integration-handler';
import { TodoCompletedPubSubIntegrationEventHandler } from './pub-sub-handlers/todo-completed.integration-handler';
import { TodoUncompletedPubSubIntegrationEventHandler } from './pub-sub-handlers/todo-uncompleted.integration-handler';

import { GetTodosQuery } from '@lib/bounded-contexts/todo/todo/queries/get-todos.query';

import { CompleteTodoCommand } from '@lib/bounded-contexts/todo/todo/commands/complete-todo.command';

export type Subscribers = {
  [subscriberId: string]: {
    timestamp: number;
    call?: ServerWritableStream<any, todo.Todo>;
    authToken: string;
    userId: string;
  };
};
const subscribers: Subscribers = {};

export type Subscriptions = {
  [integrationEvent: string]: {
    subscribers: string[];
  };
};
const subscriptions: Subscriptions = {};

// Every 30 seconds, we check if a subscriber has been inactive for more than 1 minute
// If so, we end their call and promise and remove them from the subscribers list
setInterval(() => {
  const subscriberIds = Object.keys(subscribers);
  for (const subscriberId of subscriberIds) {
    const subscriber = subscribers[subscriberId];
    if (subscriber.timestamp < Date.now() - 600 * 1000) {
      subscriber.call?.end();
      delete subscribers[subscriberId];
    }
  }
}, 30 * 1000);

async function subscribe(
  subscriberId: string,
  topics: string[],
  call: ServerWritableStream<any, todo.Todo>,
  resolveSubscription: (value: unknown) => void,
) {
  const ctx = asyncLocalStorage.getStore()?.get('context');
  await new Promise((resolve) => {
    call.on('end', () => {
      resolveSubscription(true);
      resolve(true);
    });

    call.on('error', () => {
      resolveSubscription(true);
      resolve(true);
    });

    call.on('close', () => {
      resolveSubscription(true);
      resolve(true);
    });

    call.on('finish', () => {
      resolveSubscription(true);
      resolve(true);
    });
    subscribers[subscriberId] = {
      timestamp: Date.now(),
      call,
      authToken: ctx.jwt,
      userId: ctx.userId,
    };
    topics.forEach((topic) => {
      if (!subscriptions[topic]) {
        subscriptions[topic] = {
          subscribers: [subscriberId],
        };
      } else {
        subscriptions[topic].subscribers.push(subscriberId);
      }
    });
  });
}

async function sha256Hash(message: string) {
  // Convert the message to a Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  // Generate the hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Convert the hash to a hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

@Injectable()
@Controller()
@UseGuards(JwtGrpcAuthGuard)
@UseInterceptors(CorrelationIdInterceptor, AsyncLocalStorageInterceptor)
export class TodoGrpcController {
  private readonly JWT_SECRET: string;
  private readonly JWT_LIFETIME_SECONDS: string;
  constructor(
    @Inject(BUSES_TOKENS.PUBSUB_COMMAND_BUS)
    private readonly commandBus: Infra.CommandBus.IPubSubCommandBus,
    @Inject(BUSES_TOKENS.PUBSUB_QUERY_BYS)
    private readonly queryBus: Infra.QueryBus.IQueryBus,
    @Inject(BUSES_TOKENS.PUBSUB_INTEGRATION_EVENT_BUS)
    private readonly pubSubIntegrationEventBus: Infra.EventBus.IEventBus,
    private configService: ConfigService<AuthEnvironmentVariables, true>,
  ) {
    this.JWT_SECRET = this.configService.get('jwtSecret', { infer: true });
    this.JWT_LIFETIME_SECONDS = this.configService.get('JWT_LIFETIME_SECONDS', {
      infer: true,
    });
    if (this.JWT_SECRET === '') {
      throw new Error('JWT_SECRET is not defined in env!');
    }
    this.subscribeToPubSubIntegrationEvents();
  }

  @GrpcMethod('TodoService', 'Delete')
  @Traceable({
    operation: 'DeleteTodoController',
    serviceName: 'API',
  })
  async deleteTodo(
    data: todo.DeleteTodoRequest,
  ): Promise<todo.DeleteTodoResponse> {
    const command = new DeleteTodoCommand({ id: data.id });
    const result = await this.commandBus.request(command);
    if (result.isOk) {
      return new todo.DeleteTodoResponse({
        ok: new todo.DeleteTodoOKResponse(),
      });
    } else {
      const error = result.error;
      return new todo.DeleteTodoResponse({
        error: new todo.DeleteTodoErrorResponse({
          systemUnavailableError: new todo.ErrorResponse({
            code: error?.code || 'SYSTEM_UNAVAILABLE_ERROR',
            message: error?.message || 'The system is unavailable.',
          }),
        }),
      });
    }
  }

  @GrpcMethod('TodoService', 'Uncomplete')
  @Traceable({
    operation: 'UncompleteTodoController',
    serviceName: 'API',
  })
  async uncompleteTodo(
    data: todo.UncompleteTodoRequest,
  ): Promise<todo.UncompleteTodoResponse> {
    const command = new UncompleteTodoCommand({ id: data.id });
    const result = await this.commandBus.request(command);
    if (result.isOk) {
      return new todo.UncompleteTodoResponse({
        ok: new todo.UncompleteTodoOKResponse(),
      });
    } else {
      const error = result.error;
      return new todo.UncompleteTodoResponse({
        error: new todo.UncompleteTodoErrorResponse({
          systemUnavailableError: new todo.ErrorResponse({
            code: error?.code || 'SYSTEM_UNAVAILABLE_ERROR',
            message: error?.message || 'The system is unavailable.',
          }),
        }),
      });
    }
  }

  @GrpcMethod('TodoService', 'ModifyTitle')
  @Traceable({
    operation: 'ModifyTodoTitleController',
    serviceName: 'API',
  })
  async modifyTodoTitle(
    data: todo.ModifyTitleTodoRequest,
  ): Promise<todo.ModifyTitleTodoResponse> {
    const command = new ModifyTodoTitleCommand({
      title: data.title,
      id: data.id,
    });
    const result = await this.commandBus.request(command);
    if (result.isOk) {
      return new todo.ModifyTitleTodoResponse({
        ok: new todo.ModifyTitleTodoOKResponse(),
      });
    } else {
      const error = result.error;
      return new todo.ModifyTitleTodoResponse({
        error: new todo.ModifyTitleTodoErrorResponse({
          systemUnavailableError: new todo.ErrorResponse({
            code: error?.code || 'SYSTEM_UNAVAILABLE_ERROR',
            message: error?.message || 'The system is unavailable.',
          }),
        }),
      });
    }
  }

  @GrpcMethod('TodoService', 'Add')
  @Traceable({
    operation: 'AddTodoController',
    serviceName: 'API',
  })
  async addTodo(data: todo.AddTodoRequest): Promise<todo.AddTodoResponse> {
    const command = new AddTodoCommand({ title: data.title });
    const result = await this.commandBus.request(command);
    if (result.isOk) {
      return new todo.AddTodoResponse({
        ok: new todo.AddTodoOKResponse({ id: result.data }),
      });
    } else {
      const error = result.error;
      return new todo.AddTodoResponse({
        error: new todo.AddTodoErrorResponse({
          systemUnavailableError: new todo.ErrorResponse({
            code: error?.code || 'SYSTEM_UNAVAILABLE_ERROR',
            message: error?.message || 'The system is unavailable.',
          }),
        }),
      });
    }
  }

  @GrpcMethod('TodoService', 'On')
  async on(
    request: todo.OnTodoRequest,
    metadata: Metadata,
    call: ServerWritableStream<todo.OnTodoRequest, todo.Todo>,
  ) {
    const { subscriberId, events } = request;
    await new Promise((resolve) => {
      const topics = events.map((i) => {
        switch (i) {
          case todo.TODO_EVENTS.ADDED:
            return TodoAddedPubSubIntegrationEventHandler.name;
          case todo.TODO_EVENTS.MODIFIED_TITLE:
            return TodoModifiedTitlePubSubIntegrationEventHandler.name;
          case todo.TODO_EVENTS.DELETED:
            return TodoDeletedPubSubIntegrationEventHandler.name;
          case todo.TODO_EVENTS.COMPLETED:
            return TodoCompletedPubSubIntegrationEventHandler.name;
          case todo.TODO_EVENTS.UNCOMPLETED:
            return TodoUncompletedPubSubIntegrationEventHandler.name;
        }
      });
      subscribe(subscriberId, topics, call, resolve);
    });
  }

  @GrpcMethod('TodoService', 'GetAll')
  @Traceable({
    operation: 'GetAllTodosController',
    serviceName: 'API',
  })
  async getAll(
    data: todo.GetAllTodosRequest,
    metadata: Metadata,
  ): Promise<todo.GetAllTodosResponse> {
    const result = await this.queryBus.request(new GetTodosQuery());
    if (result.isOk) {
      const mappedData = result.data.map((i) => ({
        id: i.id,
        title: i.title,
        completed: i.completed,
      }));
      const dbHash = await sha256Hash(JSON.stringify(mappedData));
      const cachedHashesAreEqual = dbHash === metadata.get('cache-hash')[0];
      if (cachedHashesAreEqual) {
        throw new RpcException('CACHE_HIT');
      }
      return new todo.GetAllTodosResponse({
        ok: new todo.GetAllTodosOKResponse({
          todos: mappedData.map((i) => new todo.Todo(i)),
        }),
      });
    } else {
      const error = result.error;
      console.error('Error while fetching todos:', error?.message);
      return new todo.GetAllTodosResponse({
        error: new todo.GetAllTodosErrorResponse({
          systemUnavailableError: new todo.ErrorResponse({
            code: error?.code || 'SYSTEM_UNAVAILABLE_ERROR',
            message: error?.message || 'The system is unavailable.',
          }),
        }),
      });
    }
  }

  @GrpcMethod('TodoService', 'Complete')
  @Traceable({
    operation: 'CompleteTodoController',
    serviceName: 'API',
  })
  async completeTodo(
    data: todo.CompleteTodoRequest,
  ): Promise<todo.CompleteTodoResponse> {
    const command = new CompleteTodoCommand({ todoId: data.id });
    const result = await this.commandBus.request(command);
    if (result.isOk) {
      return new todo.CompleteTodoResponse({
        ok: new todo.CompleteTodoOKResponse(),
      });
    } else {
      const error = result.error;
      return new todo.CompleteTodoResponse({
        error: new todo.CompleteTodoErrorResponse({
          systemUnavailableError: new todo.ErrorResponse({
            code: error?.code || 'SYSTEM_UNAVAILABLE_ERROR',
            message: error?.message || 'The system is unavailable.',
          }),
        }),
      });
    }
  }

  @GrpcMethod('TodoService', 'InitializeSubscriptionConnection')
  async initializeSubscriptionConnection(): Promise<todo.InitializeConnectionResponse> {
    const ctx = await asyncLocalStorage.getStore()?.get('context');
    const authToken = ctx.jwt;
    const userId = ctx.userId;
    const subscriberId = uuid();
    subscribers[subscriberId] = {
      timestamp: Date.now(),
      authToken,
      userId,
    };
    const response = new todo.InitializeConnectionResponse({ subscriberId });
    console.log('Subscription response', response.toObject());
    return response;
  }

  @GrpcMethod('TodoService', 'KeepSubscriptionAlive')
  async keepSubscriptionAlive(
    request: todo.KeepSubscriptionAliveRequest,
  ): Promise<todo.KeepSubscriptionAliveResponse> {
    const subscriberId = request.subscriberId;
    const subscriber = subscribers[subscriberId];
    if (!subscriber) {
      throw new RpcException('Invalid subscription');
    }
    const ctx = await asyncLocalStorage.getStore()?.get('context');
    const { userId, jwt, email } = ctx;
    // Step 1. Check if the subscriber exists and that the userId matches
    if (subscriber.authToken !== jwt || subscriber.userId !== userId) {
      throw new RpcException('Invalid subscription');
    }
    // Step 2. Check if the JWT is nearing expiration and update if necessary
    let renewedAuthToken: string | undefined = undefined;
    try {
      const jwtPayload = jwtwebtoken.verify(
        jwt,
        this.JWT_SECRET,
      ) as jwtwebtoken.JwtPayload;
      if (
        jwtPayload.exp &&
        jwtPayload.exp - Math.floor(Date.now() / 1000) < 3550
      ) {
        renewedAuthToken = jwtwebtoken.sign(
          {
            email,
            iat: Math.floor(Date.now() / 1000),
            exp:
              Math.floor(Date.now() / 1000) + Number(this.JWT_LIFETIME_SECONDS),
            sub: userId,
          },
          this.JWT_SECRET,
        );
      }
    } catch (err) {
      console.error('Error while verifying JWT', err);
      throw new RpcException('Invalid JWT!');
    }
    // Step 3. Updated the timestamp to show that the subscriber is still alive
    subscribers[subscriberId] = {
      ...subscribers[subscriberId],
      timestamp: Date.now(),
      authToken: renewedAuthToken || subscribers[subscriberId].authToken,
    };
    // Step 4. Send back the response
    const response = new todo.KeepSubscriptionAliveResponse({
      renewedAuthToken,
    });
    return response;
  }

  async subscribeToPubSubIntegrationEvents() {
    const todoAddedPubSubIntegrationEventHandler =
      new TodoAddedPubSubIntegrationEventHandler(subscriptions, subscribers);
    const todoAddedPubSubIntegrationEventHandlerTopic =
      NatsPubSubIntegrationEventsBus.getTopicFromHandler(
        todoAddedPubSubIntegrationEventHandler,
      );
    console.log(
      `Subscribing to PubSub integration event ${todoAddedPubSubIntegrationEventHandlerTopic}`,
    );
    await this.pubSubIntegrationEventBus.subscribe(
      todoAddedPubSubIntegrationEventHandlerTopic,
      todoAddedPubSubIntegrationEventHandler,
    );

    const todoModifiedTitlePubSubIntegrationEventHandler =
      new TodoModifiedTitlePubSubIntegrationEventHandler(
        subscriptions,
        subscribers,
      );
    const todoModifiedTitlePubSubIntegrationEventHandlerTopic =
      NatsPubSubIntegrationEventsBus.getTopicFromHandler(
        todoModifiedTitlePubSubIntegrationEventHandler,
      );
    console.log(
      `Subscribing to PubSub integration event ${todoModifiedTitlePubSubIntegrationEventHandlerTopic}`,
    );
    await this.pubSubIntegrationEventBus.subscribe(
      todoModifiedTitlePubSubIntegrationEventHandlerTopic,
      todoModifiedTitlePubSubIntegrationEventHandler,
    );

    const todoDeletedPubSubIntegrationEventHandler =
      new TodoDeletedPubSubIntegrationEventHandler(subscriptions, subscribers);
    const todoDeletedPubSubIntegrationEventHandlerTopic =
      NatsPubSubIntegrationEventsBus.getTopicFromHandler(
        todoDeletedPubSubIntegrationEventHandler,
      );
    console.log(
      `Subscribing to PubSub integration event ${todoDeletedPubSubIntegrationEventHandlerTopic}`,
    );
    await this.pubSubIntegrationEventBus.subscribe(
      todoDeletedPubSubIntegrationEventHandlerTopic,
      todoDeletedPubSubIntegrationEventHandler,
    );

    const todoCompletedPubSubIntegrationEventHandler =
      new TodoCompletedPubSubIntegrationEventHandler(
        subscriptions,
        subscribers,
      );
    const todoCompletedPubSubIntegrationEventHandlerTopic =
      NatsPubSubIntegrationEventsBus.getTopicFromHandler(
        todoCompletedPubSubIntegrationEventHandler,
      );
    console.log(
      `Subscribing to PubSub integration event ${todoCompletedPubSubIntegrationEventHandlerTopic}`,
    );
    await this.pubSubIntegrationEventBus.subscribe(
      todoCompletedPubSubIntegrationEventHandlerTopic,
      todoCompletedPubSubIntegrationEventHandler,
    );

    const todoUncompletedPubSubIntegrationEventHandler =
      new TodoUncompletedPubSubIntegrationEventHandler(
        subscriptions,
        subscribers,
      );
    const todoUncompletedPubSubIntegrationEventHandlerTopic =
      NatsPubSubIntegrationEventsBus.getTopicFromHandler(
        todoUncompletedPubSubIntegrationEventHandler,
      );
    console.log(
      `Subscribing to PubSub integration event ${todoUncompletedPubSubIntegrationEventHandlerTopic}`,
    );
    await this.pubSubIntegrationEventBus.subscribe(
      todoUncompletedPubSubIntegrationEventHandlerTopic,
      todoUncompletedPubSubIntegrationEventHandler,
    );
  }
}
