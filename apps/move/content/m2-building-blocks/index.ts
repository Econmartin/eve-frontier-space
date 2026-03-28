import type { Module } from '../../src/lib/types';
import lesson2_1 from './2.1-functions.lesson';
import lesson2_2 from './2.2-data-types.lesson';
import lesson2_3 from './2.3-variables.lesson';
import lesson2_4 from './2.4-math.lesson';
import lesson2_5 from './2.5-control-flow.lesson';

const module: Module = {
  id: 'm2',
  title: 'The Building Blocks',
  icon: 'assets/building-block.svg',
  lessons: [lesson2_1, lesson2_2, lesson2_3, lesson2_4, lesson2_5],
};
export default module;
