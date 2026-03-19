import type { Module } from '../../src/lib/types';
import lesson15_1 from './15.1-authorization-patterns.lesson';
import lesson15_2 from './15.2-object-capability.lesson';
import lesson15_3 from './15.3-building-against-limits.lesson';

const module: Module = {
  id: 'm15',
  title: 'Authorization & Security',
  icon: '🛡️',
  lessons: [lesson15_1, lesson15_2, lesson15_3],
};
export default module;
