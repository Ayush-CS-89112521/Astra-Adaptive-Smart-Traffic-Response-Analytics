import client from './client';

export const getModelHealth = () => client.get('/health/models');
export const getCacheHealth = () => client.get('/health/cache');
export const getTaskHealth = () => client.get('/health/tasks');
export const getWorkerHealth = () => client.get('/health/workers');
export const getPerformanceHealth = () => client.get('/health/performance');
export const getLivenessHealth = () => client.get('/health');
export const getRoutingHealth = () => client.get('/health/routing');

