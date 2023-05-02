import { Domain } from '@bitloops/bl-boilerplate-core';
import { DomainErrors } from '../errors/index';
export class TodoAlreadyCompletedRule implements Domain.IRule {
  constructor(private completed: boolean, private todoId: string) {}
  public Error = new DomainErrors.TodoAlreadyCompletedError(
    this.completed,
    this.todoId
  );
  public isBrokenIf(): boolean {
    return this.completed;
  }
}
