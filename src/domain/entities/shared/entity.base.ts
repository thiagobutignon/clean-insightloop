import { DomainEvent } from '../events/domain-event.base';

export abstract class Entity<T> {
  protected _id: T;
  private _domainEvents: DomainEvent[] = [];

  constructor(id: T) {
    this._id = id;
  }

  get id(): T {
    return this._id;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents.splice(0, this._domainEvents.length);
  }

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  public equals(object?: Entity<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!(object instanceof Entity)) {
      return false;
    }

    return this._id === object._id;
  }

  public hashCode(): number {
    return this._id ? this._id.toString().length : 0;
  }

  public toString(): string {
    return `${this.constructor.name}(${this._id})`;
  }
}