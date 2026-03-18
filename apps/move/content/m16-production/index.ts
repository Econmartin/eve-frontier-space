import type { Module } from '../../src/lib/types';
import lesson16_1 from './16.1-package-manifest.lesson';
import lesson16_2 from './16.2-package-upgrades.lesson';
import lesson16_3 from './16.3-transaction-structure.lesson';
import lesson16_4 from './16.4-fast-path-consensus.lesson';

const module: Module = {
  id: 'm16',
  title: 'Production Deployment',
  icon: '\u{1F6A2}',
  lessons: [lesson16_1, lesson16_2, lesson16_3, lesson16_4],
};
export default module;
