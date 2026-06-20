import client from './client';

export const runSimulation = (payload) => {
  return client.post('/predictions/simulate', payload);
};
