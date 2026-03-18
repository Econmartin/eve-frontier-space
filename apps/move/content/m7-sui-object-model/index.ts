import type { Module } from '../../src/lib/types';
import lesson7_1 from './7.1-sui-objects.lesson';
import lesson7_2 from './7.2-transfer-ownership.lesson';

const module: Module = {
  id: 'm7',
  title: 'Sui Object Model',
  icon: '⛓️',
  lessons: [lesson7_1, lesson7_2],
};
export default module;
