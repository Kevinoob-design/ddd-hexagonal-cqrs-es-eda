
import { Collection, MongoClient } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import * as jwtwebtoken from 'jsonwebtoken';
import { TodoReadRepoPort } from '@lib/bounded-contexts/todo/todo/ports/todo-read.repo-port';
import { TodoReadModel } from '@lib/bounded-contexts/todo/todo/domain/todo.read-model';
import { AuthEnvironmentVariables } from '@src/config/auth.configuration';
import { ConfigService } from '@nestjs/config';
import {
  Application,
  asyncLocalStorage,
  Either,
  ok,
} from '@bitloops/bl-boilerplate-core';

const MONGO_DB_DATABASE = process.env.MONGO_DB_DATABASE || 'todo';
const MONGO_DB_TODO_COLLECTION =
  process.env.MONGO_DB_TODO_COLLECTION || 'todos';

@Injectable()
export class MongoTodoReadRepository implements TodoReadRepoPort {
  private collectionName = MONGO_DB_TODO_COLLECTION;
  private dbName = MONGO_DB_DATABASE;
  private collection: Collection;
  private JWT_SECRET: string;

  constructor(
    @Inject('MONGO_DB_CONNECTION') private client: MongoClient,
    private configService: ConfigService<AuthEnvironmentVariables, true>,
  ) {
    this.collection = this.client
      .db(this.dbName)
      .collection(this.collectionName);
    this.JWT_SECRET = this.configService.get('jwtSecret', { infer: true });
  }

  @Application.Repo.Decorators.ReturnUnexpectedError()
  async getById(
    id: string,
  ): Promise<Either<TodoReadModel | null, Application.Repo.Errors.Unexpected>> {
    const ctx = asyncLocalStorage.getStore()?.get('context');
    const { jwt } = ctx;
    let jwtPayload: null | any = null;
    try {
      jwtPayload = jwtwebtoken.verify(jwt, this.JWT_SECRET);
    } catch (err) {
      throw new Error('Invalid JWT!');
    }
    const userId = jwtPayload.sub;
    if (!userId) {
      throw new Error('Invalid userId');
    }
    const todo = await this.collection.findOne({
      _id: id.toString() as any,
    });
    if (!todo) {
      return ok(null);
    }
    if (todo.userId !== userId) {
      throw new Error('Invalid userId');
    }
    return ok({
      id: todo._id.toString(),
      userId: todo.userId,
      title: todo.title,
      completed: todo.completed,
    });
  }

  @Application.Repo.Decorators.ReturnUnexpectedError()
  async getAll(): Promise<
    Either<TodoReadModel[], Application.Repo.Errors.Unexpected>
  > {
    const ctx = asyncLocalStorage.getStore()?.get('context');
    const { jwt } = ctx;
    let jwtPayload: null | any = null;
    try {
      jwtPayload = jwtwebtoken.verify(jwt, this.JWT_SECRET);
    } catch (err) {
      throw new Error('Invalid JWT!');
    }
    const userId = jwtPayload.sub;
    if (!userId) {
      throw new Error('Invalid userId');
    }
    const todos = await this.collection
      .find({ userId: userId })
      .toArray();
    return ok(
      todos.map((todo) => ({
        id: todo._id.toString(),
        userId: todo.userId,
        title: todo.title,
        completed: todo.completed,
      })),
    );
  }
}
    