import { Domain } from '@bitloops/bl-boilerplate-core';
export class InvalidEmailError extends Domain.Error {
  constructor(email: string) {
    super(`Email ${email} is invalid`, 'e09ec42c-4d31-4f7c-b68a-ac84abe9464f');
  }
}
