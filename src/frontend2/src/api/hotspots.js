import client from './client';

export const getHotspots = () => {
  return client.get('/hotspots');
};

export const getPoliceStations = () => {
  return client.get('/hotspots/stations');
};

export const getNearestStation = (lat, lon) => {
  return client.get('/hotspots/nearest-station', { params: { lat, lon } });
};
