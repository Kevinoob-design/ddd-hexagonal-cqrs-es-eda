import { Domain, Either, ok } from '@bitloops/bl-boilerplate-core';
import { UserIdProps } from './user-id.props';
export class UserIdVO extends Domain.ValueObject<UserIdProps> {
  private constructor(props: UserIdProps) {
    super(props);
  }
  public static create(props: UserIdProps): Either<UserIdVO, never> {
    return ok(new UserIdVO(props));
  }
  get id(): Domain.UUIDv4 {
    return this.props.id;
  }
}
