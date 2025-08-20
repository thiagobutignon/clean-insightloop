export abstract class DomainEvent {
  public readonly eventName: string;
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor(eventName: string, eventId?: string) {
    this.eventName = eventName;
    this.occurredOn = new Date();
    this.eventId = eventId || this.generateEventId();
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public abstract getEventData(): Record<string, any>;

  public toJSON(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      data: this.getEventData(),
    };
  }
}