import type { Module } from '../../src/lib/types';
import lesson5_1 from './5.1-generics.lesson';
import lesson5_2 from './5.2-standard-library.lesson';
import lesson5_3 from './5.3-method-syntax.lesson';
import lesson5_4 from './5.4-index-syntax.lesson';

const module: Module = {
  id: 'm5',
  title: 'Generics & Standard Library',
  icon: '🧩',
  lessons: [lesson5_1, lesson5_2, lesson5_3, lesson5_4],
};
export default module;
