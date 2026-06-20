import client from './client';

export const requestExplanation = (payload) => {
  return client.post('/explain', payload);
};
