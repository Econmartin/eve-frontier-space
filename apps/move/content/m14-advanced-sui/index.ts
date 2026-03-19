import type { Module } from '../../src/lib/types';
import lesson14_1 from './14.1-transfer-to-object.lesson';
import lesson14_2 from './14.2-epoch-time-clock.lesson';
import lesson14_3 from './14.3-randomness.lesson';
import lesson14_4 from './14.4-bcs-serialization.lesson';
import lesson14_5 from './14.5-cryptography-hashing.lesson';

const module: Module = {
  id: 'm14',
  title: 'Advanced Sui',
  icon: '\uD83D\uDD2C',
  lessons: [lesson14_1, lesson14_2, lesson14_3, lesson14_4, lesson14_5],
};
export default module;
