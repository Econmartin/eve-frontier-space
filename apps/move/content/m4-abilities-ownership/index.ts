import type { Module } from '../../src/lib/types';
import lesson4_1 from './4.1-abilities.lesson';
import lesson4_2 from './4.2-references.lesson';
import lesson4_3 from './4.3-error-handling.lesson';

const module: Module = {
  id: 'm4',
  title: 'Abilities & Ownership',
  icon: '🔑',
  lessons: [lesson4_1, lesson4_2, lesson4_3],
};
export default module;
