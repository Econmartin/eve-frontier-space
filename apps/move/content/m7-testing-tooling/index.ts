import type { Module } from '../../src/lib/types';
import lesson7_1 from './7.1-writing-tests.lesson';
import lesson7_2 from './7.2-testing-patterns.lesson';
import lesson7_3 from './7.3-packages-build-modes.lesson';
import lesson7_4 from './7.4-module-extensions.lesson';

const module: Module = {
  id: 'm7',
  title: 'Testing & Tooling',
  icon: 'assets/testing.svg',
  lessons: [lesson7_1, lesson7_2, lesson7_3, lesson7_4],
};
export default module;
