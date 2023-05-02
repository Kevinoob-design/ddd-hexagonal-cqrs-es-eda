import { Domain } from '@bitloops/bl-boilerplate-core';
import { DomainErrors } from '../errors/index';
export class CompletedTodosIsPositiveNumberRule implements Domain.IRule {
  constructor(private counter: number) {}
  public Error = new DomainErrors.InvalidTodosCounterError(this.counter);
  public isBrokenIf(): boolean {
    return this.counter < 0;
  }
}
