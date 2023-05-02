import { Domain } from '@bitloops/bl-boilerplate-core';
export class InvalidTodosCounterError extends Domain.Error {
  constructor(counter: number) {
    super(
      'Completed Todos counter is invalid',
      'eb4c48f1-1af1-4178-8c95-383cbb03527d'
    );
  }
}
