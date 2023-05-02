import { Module } from '@nestjs/common';
import {
  JetstreamModule,
  NatsPubSubIntegrationEventsBus,
  NatsPubSubQueryBus,
  NatsStreamingCommandBus,
  NatsStreamingDomainEventBus,
  NatsStreamingIntegrationEventBus,
} from '@bitloops/bl-boilerplate-infra-nest-jetstream';
import { MongoModule } from '@bitloops/bl-boilerplate-infra-mongo';
import { AuthenticationModule as LibAuthenticationModule } from '@lib/bounded-contexts/iam/authentication/authentication.module';
import { StreamingCommandHandlers } from '@lib/bounded-contexts/iam/authentication/application/command-handlers';
import { StreamingDomainEventHandlers } from '@lib/bounded-contexts/iam/authentication/application/event-handlers/domain';
import { StreamingIntegrationEventHandlers } from '@lib/bounded-contexts/iam/authentication/application/event-handlers/integration';
import {
  PubSubIntegrationEventBusToken,
  PubSubQueryBusToken,
  StreamingCommandBusToken,
  StreamingDomainEventBusToken,
  StreamingIntegrationEventBusToken,
  UserWriteRepoPortToken,
} from '@lib/bounded-contexts/iam/authentication/constants';
import { MongoUserWriteRepository } from './repositories/mongo-user-write.repository';

const providers = [
  {
    provide: UserWriteRepoPortToken,
    useClass: MongoUserWriteRepository,
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
    LibAuthenticationModule.register({
      inject: [...providers],
      imports: [MongoModule],
    }),
    JetstreamModule.forFeature({
      moduleOfHandlers: AuthenticationModule,
      streamingCommandHandlers: [...StreamingCommandHandlers],
      streamingDomainEventHandlers: [...StreamingDomainEventHandlers],
      streamingIntegrationEventHandlers: [...StreamingIntegrationEventHandlers],
    }),
  ],
  exports: [LibAuthenticationModule],
})
export class AuthenticationModule {}
