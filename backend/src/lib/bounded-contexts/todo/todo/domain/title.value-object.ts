import { Domain, Either, ok, fail } from '@bitloops/bl-boilerplate-core';
import { TitleProps } from './title.props';
import { DomainErrors } from './errors/index';
import { DomainRules } from './rules/index';
export class TitleVO extends Domain.ValueObject<TitleProps> {
  private constructor(props: TitleProps) {
    super(props);
  }
  public static create(
    props: TitleProps
  ): Either<TitleVO, DomainErrors.TitleOutOfBoundsError> {
    const res = Domain.applyRules([
      new DomainRules.TitleOutOfBoundsRule(props.title),
    ]);
    if (res) return fail(res);
    return ok(new TitleVO(props));
  }
  get title(): string {
    return this.props.title;
  }
}
