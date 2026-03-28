import type { Module } from '../../src/lib/types';
import lesson11_1 from './11.1-capability-pattern.lesson';
import lesson11_2 from './11.2-witness-pattern.lesson';
import lesson11_3 from './11.3-hot-potato-pattern.lesson';
import lesson11_4 from './11.4-wrapper-type-pattern.lesson';

const module: Module = {
  id: 'm11',
  title: 'Design Patterns',
  icon: 'assets/design-patterns.svg',
  lessons: [lesson11_1, lesson11_2, lesson11_3, lesson11_4],
};
export default module;
