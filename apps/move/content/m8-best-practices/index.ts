import type { Module } from '../../src/lib/types';
import lesson8_1 from './8.1-coding-conventions.lesson';
import lesson8_2 from './8.2-error-patterns.lesson';

const module: Module = {
  id: 'm8',
  title: 'Best Practices',
  icon: 'assets/best-practices.svg',
  lessons: [lesson8_1, lesson8_2],
};
export default module;
