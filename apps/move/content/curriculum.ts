import type { Course } from '../src/lib/types';
import m1 from './m1-getting-started/index';
import m2 from './m2-building-blocks/index';
import m3 from './m3-data-structures/index';
import m4 from './m4-abilities-ownership/index';
import m5 from './m5-testing/index';
import m6 from './m6-sui-object-model/index';
import m7 from './m7-building-on-sui/index';

export const COURSE: Course = {
  modules: [m1, m2, m3, m4, m5, m6, m7],
};
