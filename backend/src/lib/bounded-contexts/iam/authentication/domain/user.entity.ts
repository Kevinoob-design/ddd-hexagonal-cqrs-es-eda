import { Domain, Either, ok } from '@bitloops/bl-boilerplate-core';
import { UserProps } from './user.props';
import { EmailVO } from './email.value-object';
import { UserChangedEmailDomainEvent } from './events/user-changed-email.domain-event';
type TUserEntityPrimitives = {
  id: string;
  email: {
    email: string;
  };
  password: string;
  lastLogin: string;
};
export class UserEntity extends Domain.Aggregate<UserProps> {
  private constructor(props: UserProps) {
    super(props, props.id);
  }
  public static create(props: UserProps): Either<UserProps, never> {
    const user = new UserEntity(props);
    return ok(user);
  }
  get id() {
    return this._id;
  }
  get email(): EmailVO {
    return this.props.email;
  }
  get password(): string {
    return this.props.password;
  }
  get lastLogin(): string {
    return this.props.lastLogin;
  }
  public changeEmail(email: EmailVO): void {
    this.props.email = email;
    const event = new UserChangedEmailDomainEvent({
      email: this.props.email.email,
      password: this.props.password,
      aggregateId: this.props.id.toString(),
      lastLogin: this.props.lastLogin,
    });
    this.addDomainEvent(event);
  }
  public static fromPrimitives(data: TUserEntityPrimitives): UserEntity {
    const UserEntityProps = {
      id: new Domain.UUIDv4(data.id) as Domain.UUIDv4,
      email: EmailVO.create({
        email: data.email.email,
      }).value as EmailVO,
      password: data.password,
      lastLogin: data.lastLogin,
    };
    return new UserEntity(UserEntityProps);
  }
  public toPrimitives(): TUserEntityPrimitives {
    return {
      id: this.id.toString(),
      email: {
        email: this.props.email.email,
      },
      password: this.props.password,
      lastLogin: this.props.lastLogin,
    };
  }
}
