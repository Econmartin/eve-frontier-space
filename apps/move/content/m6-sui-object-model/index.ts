import type { Module } from '../../src/lib/types';
import lesson6_1 from './6.1-sui-objects.lesson';
import lesson6_2 from './6.2-transfer-ownership.lesson';

const module: Module = {
  id: 'm6',
  title: 'Sui Object Model',
  icon: '⛓️',
  lessons: [lesson6_1, lesson6_2],
};
export default module;
