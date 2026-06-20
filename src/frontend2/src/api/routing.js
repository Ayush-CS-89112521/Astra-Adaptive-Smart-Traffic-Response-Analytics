import client from './client';

export const getDiversion = (payload) => {
  return client.post('/routing/diversion', payload);
};
