import { DomainEvent } from '../../../domain/entities/events/domain-event.base';

export interface DomainEventPublisher {
  /**
   * Publish a single domain event
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple domain events
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe to domain events of a specific type
   */
  subscribe(eventType: string, handler: DomainEventHandler): void;

  /**
   * Unsubscribe from domain events
   */
  unsubscribe(eventType: string, handler: DomainEventHandler): void;
}

export interface DomainEventHandler {
  handle(event: DomainEvent): Promise<void>;
}

export interface DomainEventSubscription {
  eventType: string;
  handler: DomainEventHandler;
}