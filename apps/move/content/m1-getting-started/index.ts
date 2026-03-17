import type { Module } from '../../src/lib/types';
import lesson1_1 from './1.1-welcome.lesson';
import lesson1_2 from './1.2-comments-structure.lesson';

const module: Module = {
  id: 'm1',
  title: 'Getting Started',
  icon: '🚀',
  lessons: [lesson1_1, lesson1_2],
};
export default module;
