// Deployed 2026-03-28 to Sui Testnet (Stillness)
// See contracts/course-registry/README.md for full deploy details

export const REGISTRY_PACKAGE_ID =
  '0xe438072a5a07f43ec521877fed8a8d50421d284b8f603df90e91540f3677429f';

export const REGISTRY_OBJECT_ID =
  '0xc255bfc7a8694ef292650af87d8ec3ec06c91ba87fa25798d186fe1ffe89d5a9';

// From deploy output: Owner: Shared( 698420692 )
export const REGISTRY_INITIAL_SHARED_VERSION = 698420692;

export const COURSE_COMPLETED_EVENT_TYPE =
  `${REGISTRY_PACKAGE_ID}::course_registry::CourseCompleted`;

export const REGISTRY_GAS_BUDGET = 10_000_000;
