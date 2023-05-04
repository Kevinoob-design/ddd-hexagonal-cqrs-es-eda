
import { Module } from '@nestjs/common';
import {
  JetstreamModule,
  NatsPubSubQueryBus,
  NatsPubSubIntegrationEventsBus,
  NatsStreamingCommandBus,
  NatsStreamingDomainEventBus,
  NatsStreamingIntegrationEventBus,
} from '@bitloops/bl-boilerplate-infra-nest-jetstream';
import { MongoModule } from '@bitloops/bl-boilerplate-infra-mongo';
import { AuthenticationModule as LibAuthenticationModule } from '@lib/bounded-contexts/iam/authentication/authentication.module';
import { PubSubCommandHandlers, StreamingCommandHandlers } from '@lib/bounded-contexts/iam/authentication/application/command-handlers';
import { QueryHandlers } from '@lib/bounded-contexts/iam/authentication/application/query-handlers';
import { StreamingDomainEventHandlers } from '@lib/bounded-contexts/iam/authentication/application/event-handlers/domain';
import { StreamingIntegrationEventHandlers } from '@lib/bounded-contexts/iam/authentication/application/event-handlers/integration';
import {
  UserWriteRepoPortToken,
  PubSubQueryBusToken,
  PubSubIntegrationEventBusToken,
  StreamingCommandBusToken,
  StreamingDomainEventBusToken,
  StreamingIntegrationEventBusToken,
} from '@lib/bounded-contexts/iam/authentication/constants';
import { MongoUserWriteRepository } from './repositories/mongo-user-write.repository';

const providers = [
  {
    provide: UserWriteRepoPortToken,
    useClass: MongoUserWriteRepository,
  },
  {
    provide: PubSubQueryBusToken,
    useClass: NatsPubSubQueryBus,
  },
  {
    provide: PubSubIntegrationEventBusToken,
    useClass: NatsPubSubIntegrationEventsBus,
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
];
@Module({
  imports: [
    LibAuthenticationModule.register({
      inject: [...providers],
      imports: [MongoModule],
    }),
    JetstreamModule.forFeature({
      moduleOfHandlers: AuthenticationModule,
      streamingCommandHandlers: [...StreamingCommandHandlers],
      pubSubCommandHandlers: [...PubSubCommandHandlers],
      streamingDomainEventHandlers: [...StreamingDomainEventHandlers],
      streamingIntegrationEventHandlers: [...StreamingIntegrationEventHandlers],
      pubSubQueryHandlers: [...QueryHandlers],
    }),
  ],
  exports: [LibAuthenticationModule],
})
export class AuthenticationModule {}
