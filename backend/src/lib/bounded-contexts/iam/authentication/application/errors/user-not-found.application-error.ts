import { Application } from '@bitloops/bl-boilerplate-core';
export class UserNotFoundError extends Application.Error {
  constructor(id: string) {
    super(
      `User with id ${id} was not found`,
      'f1cd80d2-4055-47b1-8769-7dd5c5d7d1d5'
    );
  }
}
