import type { Module } from '../../src/lib/types';
import lesson12_1 from './12.1-dynamic-fields.lesson';
import lesson12_2 from './12.2-dynamic-object-fields.lesson';
import lesson12_3 from './12.3-dynamic-collections.lesson';
import lesson12_4 from './12.4-collections.lesson';

const module: Module = {
  id: 'm12',
  title: 'Dynamic Storage',
  icon: 'assets/dynamic-storage.svg',
  lessons: [lesson12_1, lesson12_2, lesson12_3, lesson12_4],
};
export default module;
