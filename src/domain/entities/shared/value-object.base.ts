export abstract class ValueObject {
  protected abstract getEqualityComponents(): any[];

  public equals(object?: ValueObject): boolean {
    if (object === null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!(object instanceof ValueObject)) {
      return false;
    }

    if (this.constructor !== object.constructor) {
      return false;
    }

    return this.areEqual(this.getEqualityComponents(), object.getEqualityComponents());
  }

  private areEqual(left: any[], right: any[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) {
        return false;
      }
    }

    return true;
  }

  public hashCode(): number {
    const components = this.getEqualityComponents();
    let hash = 0;
    
    for (const component of components) {
      if (component !== null && component !== undefined) {
        hash ^= this.getHashCode(component);
      }
    }

    return hash;
  }

  private getHashCode(obj: any): number {
    if (typeof obj === 'string') {
      let hash = 0;
      for (let i = 0; i < obj.length; i++) {
        const char = obj.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash;
    }

    if (typeof obj === 'number') {
      return obj;
    }

    return obj?.toString()?.length || 0;
  }

  public toString(): string {
    return `${this.constructor.name}(${JSON.stringify(this.getEqualityComponents())})`;
  }
}