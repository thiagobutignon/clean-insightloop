import { DomainEvent } from '../../domain/entities/events/domain-event.base';
import { 
  DomainEventPublisher, 
  DomainEventHandler, 
  DomainEventSubscription 
} from '../../application/ports/output/domain-event-publisher.port';
import { LoggerPort } from '../../application/ports/output/logger.port';

export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private subscriptions: Map<string, DomainEventHandler[]> = new Map();
  private eventHistory: DomainEvent[] = [];
  private readonly maxHistorySize: number;

  constructor(
    private readonly logger: LoggerPort,
    maxHistorySize: number = 1000
  ) {
    this.maxHistorySize = maxHistorySize;
  }

  async publish(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Publishing domain event', {
        eventName: event.eventName,
        eventId: event.eventId,
        occurredOn: event.occurredOn
      });

      // Add to history
      this.addToHistory(event);

      // Get handlers for this event type
      const handlers = this.subscriptions.get(event.eventName) || [];

      // Execute all handlers
      const promises = handlers.map(handler => this.executeHandler(handler, event));
      await Promise.allSettled(promises);

      this.logger.debug('Domain event published successfully', {
        eventName: event.eventName,
        eventId: event.eventId,
        handlerCount: handlers.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error('Failed to publish domain event', {
        eventName: event.eventName,
        eventId: event.eventId,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    this.logger.info('Publishing multiple domain events', {
      eventCount: events.length,
      eventTypes: events.map(e => e.eventName)
    });

    const promises = events.map(event => this.publish(event));
    await Promise.allSettled(promises);
  }

  subscribe(eventType: string, handler: DomainEventHandler): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const handlers = this.subscriptions.get(eventType)!;
    
    // Avoid duplicate subscriptions
    if (!handlers.includes(handler)) {
      handlers.push(handler);
      
      this.logger.debug('Handler subscribed to domain event', {
        eventType,
        handlerCount: handlers.length
      });
    }
  }

  unsubscribe(eventType: string, handler: DomainEventHandler): void {
    const handlers = this.subscriptions.get(eventType);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      
      this.logger.debug('Handler unsubscribed from domain event', {
        eventType,
        handlerCount: handlers.length
      });

      // Clean up empty arrays
      if (handlers.length === 0) {
        this.subscriptions.delete(eventType);
      }
    }
  }

  // Additional utility methods

  /**
   * Get all subscriptions
   */
  getSubscriptions(): DomainEventSubscription[] {
    const subscriptions: DomainEventSubscription[] = [];
    
    for (const [eventType, handlers] of this.subscriptions.entries()) {
      for (const handler of handlers) {
        subscriptions.push({ eventType, handler });
      }
    }

    return subscriptions;
  }

  /**
   * Get event history
   */
  getEventHistory(): DomainEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string): DomainEvent[] {
    return this.eventHistory.filter(event => event.eventName === eventType);
  }

  /**
   * Get events in date range
   */
  getEventsByDateRange(startDate: Date, endDate: Date): DomainEvent[] {
    return this.eventHistory.filter(event => 
      event.occurredOn >= startDate && event.occurredOn <= endDate
    );
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
    this.logger.debug('Event history cleared');
  }

  /**
   * Get subscription count for event type
   */
  getSubscriptionCount(eventType: string): number {
    return this.subscriptions.get(eventType)?.length || 0;
  }

  /**
   * Check if event type has subscribers
   */
  hasSubscribers(eventType: string): boolean {
    return this.getSubscriptionCount(eventType) > 0;
  }

  /**
   * Get all subscribed event types
   */
  getSubscribedEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Subscribe to multiple event types with the same handler
   */
  subscribeToMultiple(eventTypes: string[], handler: DomainEventHandler): void {
    eventTypes.forEach(eventType => this.subscribe(eventType, handler));
  }

  /**
   * Unsubscribe from multiple event types
   */
  unsubscribeFromMultiple(eventTypes: string[], handler: DomainEventHandler): void {
    eventTypes.forEach(eventType => this.unsubscribe(eventType, handler));
  }

  /**
   * Clear all subscriptions
   */
  clearAllSubscriptions(): void {
    this.subscriptions.clear();
    this.logger.info('All event subscriptions cleared');
  }

  /**
   * Wait for all pending events to be processed
   */
  async waitForCompletion(): Promise<void> {
    // Since this is an in-memory implementation, events are processed synchronously
    // This method is here for interface compatibility with async implementations
    return Promise.resolve();
  }

  // Private helper methods

  private async executeHandler(handler: DomainEventHandler, event: DomainEvent): Promise<void> {
    try {
      await handler.handle(event);
      
      this.logger.debug('Domain event handler executed successfully', {
        eventName: event.eventName,
        eventId: event.eventId,
        handler: handler.constructor.name
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error('Domain event handler failed', {
        eventName: event.eventName,
        eventId: event.eventId,
        handler: handler.constructor.name,
        error: errorMessage,
        stack: errorStack
      });

      // Don't re-throw to prevent one handler from stopping others
      // In a production system, you might want to implement retry logic
    }
  }

  private addToHistory(event: DomainEvent): void {
    this.eventHistory.push(event);

    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift(); // Remove oldest event
    }
  }

  /**
   * Get statistics about the event publisher
   */
  getStatistics(): {
    totalSubscriptions: number;
    eventTypesCount: number;
    historySize: number;
    maxHistorySize: number;
    eventsByType: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    
    for (const event of this.eventHistory) {
      eventsByType[event.eventName] = (eventsByType[event.eventName] || 0) + 1;
    }

    return {
      totalSubscriptions: this.getSubscriptions().length,
      eventTypesCount: this.subscriptions.size,
      historySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize,
      eventsByType
    };
  }
}