import { Domain, Either, ok, fail } from '@bitloops/bl-boilerplate-core';
import { EmailProps } from './email.props';
import { DomainErrors } from './errors/index';
import { DomainRules } from './rules/index';
export class EmailVO extends Domain.ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }
  public static create(
    props: EmailProps
  ): Either<EmailVO, DomainErrors.InvalidEmailDomainError> {
    const res = Domain.applyRules([
      new DomainRules.ValidEmailRule(props.email),
    ]);
    if (res) return fail(res);
    return ok(new EmailVO(props));
  }
  get email(): string {
    return this.props.email;
  }
}
