
import { Module } from '@nestjs/common';
import {
  NatsStreamingCommandBus,
  JetstreamModule,
  NatsStreamingDomainEventBus,
  NatsStreamingIntegrationEventBus,
  NatsPubSubIntegrationEventsBus,
  NatsPubSubQueryBus,
} from '@bitloops/bl-boilerplate-infra-nest-jetstream';
import { MongoModule } from '@bitloops/bl-boilerplate-infra-mongo';
import { MarketingModule as LibMarketingModule } from '@lib/bounded-contexts/marketing/marketing/marketing.module';
import { StreamingIntegrationEventHandlers } from '@lib/bounded-contexts/marketing/marketing/application/event-handlers/integration';
import { StreamingCommandHandlers } from '@lib/bounded-contexts/marketing/marketing/application/command-handlers';
import { StreamingDomainEventHandlers } from '@lib/bounded-contexts/marketing/marketing/application/event-handlers/domain';
import {
  EmailServicePortToken,
  NotificationTemplateReadRepoPortToken,
  PubSubIntegrationEventBusToken,
  StreamingCommandBusToken,
  StreamingDomainEventBusToken,
  StreamingIntegrationEventBusToken,
  UserWriteRepoPortToken,
  PubSubQueryBusToken,
} from '@lib/bounded-contexts/marketing/marketing/constants';
import { MongoUserWriteRepository } from './repositories/mongo-user-write.repository';
import { MongoNotificationTemplateReadRepository } from './repositories/mongo-notification-template-read.repository';
import { MockEmailService } from './services/mock-email.service';

const providers = [
  {
    provide: UserWriteRepoPortToken,
    useClass: MongoUserWriteRepository,
  },
  {
    provide: NotificationTemplateReadRepoPortToken,
    useClass: MongoNotificationTemplateReadRepository,
  },
  {
    provide: EmailServicePortToken,
    useClass: MockEmailService,
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
  }
];
@Module({
  imports: [
    LibMarketingModule.register({
      inject: [...providers],
      imports: [MongoModule],
    }),
    JetstreamModule.forFeature({
      moduleOfHandlers: MarketingModule,
      streamingIntegrationEventHandlers: [...StreamingIntegrationEventHandlers],
      streamingDomainEventHandlers: [...StreamingDomainEventHandlers],
      streamingCommandHandlers: [...StreamingCommandHandlers],
    }),
  ],
  exports: [LibMarketingModule],
})
export class MarketingModule {}

