import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp up to 20 users
    { duration: '1m', target: 20 },  // stay at 20 users
    { duration: '15s', target: 0 },  // ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    http_req_failed: ['rate<0.01'],                  // error rate < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/token`, JSON.stringify({
    username: 'operator@astra.demo',
    password: 'AstraOps2024!'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const token = loginRes.json('access_token');
  return { token };
}

export default function (data) {
  const token = data.token;
  if (!token) {
    console.log("No token available!");
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const lat = 12.9716 + (Math.random() - 0.5) * 0.1;
  const lon = 77.5946 + (Math.random() - 0.5) * 0.1;

  const eventPayload = JSON.stringify({
    event_type: 'unplanned',
    event_cause: 'vehicle_breakdown',
    latitude: lat,
    longitude: lon,
    description: 'Vehicle breakdown blocking road lanes',
    crowd_size: Math.floor(Math.random() * 500) + 50,
    event_duration: 60,
    vehicle_type: 'heavy_vehicle',
    corridor: 'MG Road'
  });

  // 1. Predict Severity
  const sevRes = http.post(`${BASE_URL}/api/v1/predict/severity`, eventPayload, { headers });
  check(sevRes, {
    'severity status is 200': (r) => r.status === 200,
    'severity returned': (r) => r.json('severity') !== undefined,
  });

  // 2. Predict Closure
  const clsRes = http.post(`${BASE_URL}/api/v1/predict/closure`, eventPayload, { headers });
  check(clsRes, {
    'closure status is 200': (r) => r.status === 200,
    'closure_probability returned': (r) => r.json('closure_probability') !== undefined,
  });

  // 3. Explain
  const expRes = http.post(`${BASE_URL}/api/v1/explain`, eventPayload, { headers });
  check(expRes, {
    'explain status is 200': (r) => r.status === 200,
    'explain prediction returned': (r) => r.json('prediction') !== undefined,
  });

  // 4. Similarity Search
  const simRes = http.post(`${BASE_URL}/api/v1/similarity/search`, eventPayload, { headers });
  check(simRes, {
    'similarity status is 200': (r) => r.status === 200,
    'similarity matches returned': (r) => Array.isArray(r.json('matches')),
  });

  // 5. Diversion Routing
  const diversionPayload = JSON.stringify({
    event_lat: lat,
    event_lon: lon,
    closure_probability: 0.75,
    destination_lat: 12.9754,
    destination_lon: 77.6069
  });
  const divRes = http.post(`${BASE_URL}/api/v1/routing/diversion`, diversionPayload, { headers });
  check(divRes, {
    'routing status is 200': (r) => r.status === 200,
    'routing distance returned': (r) => r.json('distance_km') !== undefined,
  });

  sleep(Math.random() * 2 + 1); // wait between 1 to 3 seconds
}
