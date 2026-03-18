import type { Course } from '../src/lib/types';
import m1 from './m1-getting-started/index';
import m2 from './m2-building-blocks/index';
import m3 from './m3-data-structures/index';
import m4 from './m4-abilities-ownership/index';
import m5 from './m5-generics-stdlib/index';
import m6 from './m6-advanced-move/index';
import m7 from './m7-testing-tooling/index';
import m8 from './m8-best-practices/index';
import m9 from './m9-sui-object-model/index';
import m10 from './m10-entry-lifecycle/index';
import m11 from './m11-design-patterns/index';
import m12 from './m12-dynamic-storage/index';
import m13 from './m13-tokens-assets/index';
import m14 from './m14-advanced-sui/index';
import m15 from './m15-auth-security/index';
import m16 from './m16-production/index';

export const COURSE: Course = {
  modules: [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16],
};
