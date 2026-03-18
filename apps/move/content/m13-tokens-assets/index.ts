import type { Module } from '../../src/lib/types';
import lesson13_1 from './13.1-balance-and-coin.lesson';
import lesson13_2 from './13.2-publisher.lesson';
import lesson13_3 from './13.3-object-display.lesson';

const module: Module = {
  id: 'm13',
  title: 'Tokens & Digital Assets',
  icon: '💰',
  lessons: [lesson13_1, lesson13_2, lesson13_3],
};
export default module;
