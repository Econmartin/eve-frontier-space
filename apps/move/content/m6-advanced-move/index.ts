import type { Module } from '../../src/lib/types';
import lesson6_1 from './6.1-macro-functions.lesson';
import lesson6_2 from './6.2-type-reflection.lesson';

const module: Module = {
  id: 'm6',
  title: 'Advanced Move',
  icon: 'assets/advanced-move.svg',
  lessons: [lesson6_1, lesson6_2],
};
export default module;
