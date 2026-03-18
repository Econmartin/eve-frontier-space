import type { Module } from '../../src/lib/types';
import lesson10_1 from './10.1-entry-functions.lesson';
import lesson10_2 from './10.2-init-functions.lesson';
import lesson10_3 from './10.3-events.lesson';

const module: Module = {
  id: 'm10',
  title: 'Entry Points & Lifecycle',
  icon: '🔄',
  lessons: [lesson10_1, lesson10_2, lesson10_3],
};
export default module;
