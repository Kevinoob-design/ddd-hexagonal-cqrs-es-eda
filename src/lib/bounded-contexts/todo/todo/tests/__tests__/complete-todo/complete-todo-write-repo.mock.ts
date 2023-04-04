import {
  Application,
  Domain,
  Either,
  ok,
  fail,
} from '@bitloops/bl-boilerplate-core';
import { TodoEntity } from '@src/lib/bounded-contexts/todo/todo/domain/TodoEntity';
import { TodoWriteRepoPort } from '@src/lib/bounded-contexts/todo/todo/ports/TodoWriteRepoPort';
import { DomainErrors } from '@src/lib/bounded-contexts/todo/todo/domain/errors';
import {
  COMPLETE_TODO_ALREADY_COMPLETED_CASE,
  COMPLETE_TODO_NOT_FOUND_CASE,
  COMPLETE_TODO_REPO_ERROR_GETBYID_CASE,
  COMPLETE_TODO_REPO_ERROR_SAVE_CASE,
  COMPLETE_TODO_SUCCESS_CASE,
} from './complete-todo.mock';

export class MockCompleteTodoWriteRepo {
  public readonly mockUpdateMethod: jest.Mock;
  public readonly mockGetByIdMethod: jest.Mock;
  private mockTodoWriteRepo: TodoWriteRepoPort;

  constructor() {
    this.mockUpdateMethod = this.getMockUpdateMethod();
    this.mockGetByIdMethod = this.getMockGetByIdMethod();
    this.mockTodoWriteRepo = {
      save: jest.fn(),
      getById: this.mockGetByIdMethod,
      update: this.mockUpdateMethod,
      delete: jest.fn(),
    };
  }

  getMockTodoWriteRepo(): TodoWriteRepoPort {
    return this.mockTodoWriteRepo;
  }

  private getMockUpdateMethod(): jest.Mock {
    return jest.fn(
      (
        todo: TodoEntity,
      ): Promise<Either<void, Application.Repo.Errors.Unexpected>> => {
        if (
          todo.userId.id.equals(
            new Domain.UUIDv4(COMPLETE_TODO_REPO_ERROR_SAVE_CASE.userId),
          )
        ) {
          return Promise.resolve(
            fail(new Application.Repo.Errors.Unexpected('Unexpected error')),
          );
        }
        return Promise.resolve(ok());
      },
    );
  }

  private getMockGetByIdMethod() {
    return jest.fn(
      (
        id: Domain.UUIDv4,
      ): Promise<
        Either<
          TodoEntity | null,
          | DomainErrors.TodoAlreadyCompletedError
          | Application.Repo.Errors.Unexpected
        >
      > => {
        if (id.equals(new Domain.UUIDv4(COMPLETE_TODO_SUCCESS_CASE.id))) {
          const todo = TodoEntity.fromPrimitives(COMPLETE_TODO_SUCCESS_CASE);
          return Promise.resolve(ok(todo));
        }
        if (id.equals(new Domain.UUIDv4(COMPLETE_TODO_NOT_FOUND_CASE.id))) {
          return Promise.resolve(ok(null));
        }
        if (
          id.equals(new Domain.UUIDv4(COMPLETE_TODO_ALREADY_COMPLETED_CASE.id))
        ) {
          return Promise.resolve(
            fail(new DomainErrors.TodoAlreadyCompletedError(id.toString())),
          );
        }
        if (
          id.equals(new Domain.UUIDv4(COMPLETE_TODO_REPO_ERROR_GETBYID_CASE.id))
        ) {
          return Promise.resolve(
            fail(new Application.Repo.Errors.Unexpected('Unexpected error')),
          );
        }
        if (
          id.equals(new Domain.UUIDv4(COMPLETE_TODO_REPO_ERROR_SAVE_CASE.id))
        ) {
          const todo = TodoEntity.fromPrimitives(
            COMPLETE_TODO_REPO_ERROR_SAVE_CASE,
          );
          return Promise.resolve(ok(todo));
        }
        return Promise.resolve(ok(null));
      },
    );
  }
}
