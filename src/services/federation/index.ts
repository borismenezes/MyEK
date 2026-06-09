/**
 * MyEK micro-frontend host runtime. Dormant in P1 (nothing here is invoked from
 * boot — see config.mf.enabled); wired into the shell in P2.
 */
export * from './types';
export * from './shellVersion';
export * from './manifestCache';
export * from './dynamicRemotes';
export * from './catalogService';
export { FederatedRemote } from './FederatedRemote';
