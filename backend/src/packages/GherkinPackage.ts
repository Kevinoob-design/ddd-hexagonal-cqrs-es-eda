import * as Chance from 'chance';
import { GherkinPackagePort } from './GherkinPackagePort';

export default class BitloopsGherkinPackageAdapter
  implements GherkinPackagePort
{
  randomPrime(): number {
    const chance: any = new Chance();
    return chance.prime();
  }
}

export const GherkinPackage: GherkinPackagePort =
  new BitloopsGherkinPackageAdapter();
