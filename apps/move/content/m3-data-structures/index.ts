import type { Module } from '../../src/lib/types';
import lesson3_1 from './3.1-structs.lesson';
import lesson3_2 from './3.2-vectors.lesson';
import lesson3_3 from './3.3-enums.lesson';

const module: Module = {
  id: 'm3',
  title: 'Data Structures',
  icon: '🏗️',
  lessons: [lesson3_1, lesson3_2, lesson3_3],
};
export default module;
