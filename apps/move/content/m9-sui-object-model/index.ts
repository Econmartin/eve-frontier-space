import type { Module } from '../../src/lib/types';
import lesson9_1 from './9.1-what-makes-sui-different.lesson';
import lesson9_2 from './9.2-creating-objects.lesson';
import lesson9_3 from './9.3-transfer-ownership.lesson';

const module: Module = {
  id: 'm9',
  title: 'The Sui Object Model',
  icon: '⛓️',
  lessons: [lesson9_1, lesson9_2, lesson9_3],
};
export default module;
