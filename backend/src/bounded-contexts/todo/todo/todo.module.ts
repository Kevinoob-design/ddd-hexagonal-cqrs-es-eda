
  import { Module } from '@nestjs/common';
  import {
    JetstreamModule,
    NatsStreamingCommandBus,
    NatsStreamingDomainEventBus,
    NatsStreamingIntegrationEventBus,
    NatsPubSubIntegrationEventsBus,
    NatsPubSubQueryBus,
  } from '@bitloops/bl-boilerplate-infra-nest-jetstream';
  import { MongoModule } from '@bitloops/bl-boilerplate-infra-mongo';
  import { TodoModule as LibTodoModule } from '@lib/bounded-contexts/todo/todo/todo.module';
  import { StreamingIntegrationEventHandlers } from '@lib/bounded-contexts/todo/todo/application/event-handlers/integration';
  import { StreamingCommandHandlers } from '@lib/bounded-contexts/todo/todo/application/command-handlers';
  import { StreamingDomainEventHandlers } from '@lib/bounded-contexts/todo/todo/application/event-handlers/domain';
  import {
    PubSubIntegrationEventBusToken,
    StreamingCommandBusToken,
    StreamingDomainEventBusToken,
    StreamingIntegrationEventBusToken,
    TodoReadRepoPortToken,
    TodoWriteRepoPortToken,
    PubSubQueryBusToken,
  } from '@lib/bounded-contexts/todo/todo/constants';
  import { MongoTodoWriteRepository } from './repositories/mongo-todo-write.repository';
  import { MongoTodoReadRepository } from './repositories/mongo-todo-read.repository';

  const providers = [
    {
      provide: TodoWriteRepoPortToken,
      useClass: MongoTodoWriteRepository,
    },
    {
      provide: TodoReadRepoPortToken,
      useClass: MongoTodoReadRepository,
    },
    {
      provide: StreamingCommandBusToken,
      useClass: NatsStreamingCommandBus,
    },
    {
      provide: StreamingDomainEventBusToken,
      useClass: NatsStreamingDomainEventBus,
    },
    {
      provide: StreamingIntegrationEventBusToken,
      useClass: NatsStreamingIntegrationEventBus,
    },
    {
      provide: PubSubIntegrationEventBusToken,
      useClass: NatsPubSubIntegrationEventsBus,
    },
    {
      provide: PubSubQueryBusToken,
      useClass: NatsPubSubQueryBus,
    },
  ];
  @Module({
    imports: [
      LibTodoModule.register({
        inject: [...providers],
        imports: [MongoModule],
      }),
      JetstreamModule.forFeature({
        moduleOfHandlers: TodoModule,
        streamingIntegrationEventHandlers: [
          ...StreamingIntegrationEventHandlers,
        ],
        streamingDomainEventHandlers: [...StreamingDomainEventHandlers],
        streamingCommandHandlers: [...StreamingCommandHandlers],
      }),
    ],
    exports: [LibTodoModule],
  })
  export class TodoModule {}
  