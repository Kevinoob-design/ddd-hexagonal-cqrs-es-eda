import { Domain, Either, ok, fail } from '@bitloops/bl-boilerplate-core';
import { UserProps } from './user.props';
import { CompletedTodosVO } from './completed-todos.value-object';
import { EmailVO } from './email.value-object';
import { TodoCompletionsIncrementedDomainEvent } from './events/todo-completions-incremented.domain-event';
import { DomainErrors } from './errors/index';
type TUserEntityPrimitives = {
  id: string;
  completedTodos: {
    counter: number;
  };
  email: {
    email: string;
  };
};
export class UserEntity extends Domain.Aggregate<UserProps> {
  private constructor(props: UserProps) {
    super(props, props.id);
  }
  public static create(props: UserProps): Either<UserEntity, never> {
    const userEntity = new UserEntity(props);
    return ok(userEntity);
  }
  get id() {
    return this._id;
  }
  get completedTodos(): CompletedTodosVO {
    return this.props.completedTodos;
  }
  get email(): EmailVO {
    return this.props.email;
  }
  public incrementCompletedTodos(): Either<
    void,
    DomainErrors.InvalidTodosCounterError
  > {
    const incrementedCompletedTodos = this.props.completedTodos.counter + 1;
    const completedTodos = CompletedTodosVO.create({
      counter: incrementedCompletedTodos,
    });
    if (!completedTodos.isFail()) {
      this.props.completedTodos = completedTodos.value;
      const event = new TodoCompletionsIncrementedDomainEvent({
        completedTodos: this.props.completedTodos.counter,
        aggregateId: this.props.id.toString(),
      });
      this.addDomainEvent(event);
      return ok();
    } else {
      return fail(completedTodos.value);
    }
  }
  public isFirstTodo(): boolean {
    return this.props.completedTodos.counter === 1;
  }
  public changeEmail(
    email: string
  ): Either<void, DomainErrors.InvalidEmailDomainError> {
    const newEmail = EmailVO.create({ email: email });
    if (!newEmail.isFail()) {
      this.props.email = newEmail.value;
      return ok();
    } else {
      return fail(newEmail.value);
    }
  }
  public static fromPrimitives(data: TUserEntityPrimitives): UserEntity {
    const UserEntityProps = {
      id: new Domain.UUIDv4(data.id) as Domain.UUIDv4,
      completedTodos: CompletedTodosVO.create({
        counter: data.completedTodos.counter,
      }).value as CompletedTodosVO,
      email: EmailVO.create({
        email: data.email.email,
      }).value as EmailVO,
    };
    return new UserEntity(UserEntityProps);
  }
  public toPrimitives(): TUserEntityPrimitives {
    return {
      id: this.id.toString(),
      completedTodos: {
        counter: this.props.completedTodos.counter,
      },
      email: {
        email: this.props.email.email,
      },
    };
  }
}
