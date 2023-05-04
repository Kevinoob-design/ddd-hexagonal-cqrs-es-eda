
      import {
        Application,
        Domain,
        Either,
        Infra,
        asyncLocalStorage,
        ok,
      } from '@bitloops/bl-boilerplate-core';
      import { Injectable, Inject } from '@nestjs/common';
      import { Pool } from 'pg';
      import * as jwtwebtoken from 'jsonwebtoken';
      import { UserEntity } from '@lib/bounded-contexts/iam/authentication/domain/user.entity';
      import { UserWriteRepoPort } from '@lib/bounded-contexts/iam/authentication/ports/user-write.repo-port';
      import { ConfigService } from '@nestjs/config';
      import { AuthEnvironmentVariables } from '@src/config/auth.configuration';
      import { StreamingDomainEventBusToken } from '@lib/bounded-contexts/iam/authentication/constants';
      
      @Injectable()
      export class PostgresUserWriteRepository implements UserWriteRepoPort {
        private JWT_SECRET: string;
      
        constructor(
          @Inject('POSTGRES_DB_CONNECTION') private client: Pool,
          @Inject(StreamingDomainEventBusToken)
          private readonly domainEventBus: Infra.EventBus.IEventBus,
          private configService: ConfigService<AuthEnvironmentVariables, true>,
        ) {
          this.JWT_SECRET = this.configService.get('jwtSecret', { infer: true });
        }
      
        @Application.Repo.Decorators.ReturnUnexpectedError()
        async getById(
          id: Domain.UUIDv4,
        ): Promise<Either<UserEntity | null, Application.Repo.Errors.Unexpected>> {
          const ctx = asyncLocalStorage.getStore()?.get('context');
          const { jwt } = ctx;
          let jwtPayload: null | any = null;
          try {
            jwtPayload = jwtwebtoken.verify(jwt, this.JWT_SECRET);
          } catch (err) {
            throw new Error('Invalid JWT!');
          }
          const { rows } = await this.client.query(
            'SELECT * FROM users WHERE id = $1',
            [id.toString()],
          );
      
          if (rows.length === 0) {
            return ok(null);
          }
      
          if (rows[0].id !== jwtPayload.sub) {
            throw new Error('Invalid userId');
          }
      
          return ok(UserEntity.fromPrimitives(rows[0]));
        }
      
        @Application.Repo.Decorators.ReturnUnexpectedError()
        async update(
          user: UserEntity,
        ): Promise<Either<void, Application.Repo.Errors.Unexpected>> {
          const ctx = asyncLocalStorage.getStore()?.get('context');
          const { jwt } = ctx;
          let jwtPayload: null | any = null;
          try {
            jwtPayload = jwtwebtoken.verify(jwt, this.JWT_SECRET);
          } catch (err) {
            throw new Error('Invalid JWT!');
          }
          const userPrimitives = user.toPrimitives();
          if (userPrimitives.id !== jwtPayload.sub) {
            throw new Error('Unauthorized userId');
          }
          const { id, ...userInfo } = userPrimitives;
          await this.client.query(
            'UPDATE users SET email = $1, password = $2 WHERE id = $3',
            [userInfo.email, userInfo.password, id],
          );
      
          this.domainEventBus.publish(user.domainEvents);
          return ok();
        }
      
        @Application.Repo.Decorators.ReturnUnexpectedError()
        delete(
          aggregate: UserEntity,
        ): Promise<Either<void, Application.Repo.Errors.Unexpected>> {
          throw new Error('Method not implemented.');
        }
      
        @Application.Repo.Decorators.ReturnUnexpectedError()
        async save(
          user: UserEntity,
        ): Promise<Either<void, Application.Repo.Errors.Unexpected>> {
          const createdUser = user.toPrimitives();
      
          await this.client.query(
            'INSERT INTO users (id, email, password) VALUES ($1, $2, $3)',
            [createdUser.id, createdUser.email, createdUser.password],
          );
      
          this.domainEventBus.publish(user.domainEvents);
          return ok();
        }
      }
      