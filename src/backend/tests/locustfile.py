import random
from locust import HttpUser, task, between

class AstraLoadTester(HttpUser):
    wait_time = between(0.5, 2.0)
    token = None

    def on_start(self):
        # Authenticate
        payload = {
            "username": "operator@astra.demo",
            "password": "AstraOps2024!"
        }
        response = self.client.post("/api/v1/auth/token", json=payload)
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            print("Authentication failed!")

    @task(3)
    def predict_severity(self):
        if not self.token:
            return
        payload = {
            "event_type": "unplanned",
            "event_cause": random.choice(["vehicle_breakdown", "road_accident", "waterlogging", "protest"]),
            "latitude": random.uniform(12.85, 13.10),
            "longitude": random.uniform(77.45, 77.70),
            "description": f"Incident reported due to {random.choice(['vehicle breakdown', 'severe flooding', 'road closure'])} on major road",
            "crowd_size": random.randint(10, 1000),
            "event_duration": random.uniform(10.0, 120.0),
            "vehicle_type": random.choice(["heavy_vehicle", "two_wheeler", "four_wheeler"]),
            "corridor": random.choice(["MG Road", "Outer Ring Road", "Hosur Road", "Mysore Road", None])
        }
        self.client.post(
            "/api/v1/predict/severity",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @task(2)
    def predict_closure(self):
        if not self.token:
            return
        payload = {
            "event_type": "unplanned",
            "event_cause": random.choice(["vehicle_breakdown", "road_accident", "waterlogging", "protest"]),
            "latitude": random.uniform(12.85, 13.10),
            "longitude": random.uniform(77.45, 77.70),
            "description": f"Incident reported due to {random.choice(['vehicle breakdown', 'severe flooding', 'road closure'])} on major road",
            "crowd_size": random.randint(10, 1000),
            "event_duration": random.uniform(10.0, 120.0),
            "vehicle_type": random.choice(["heavy_vehicle", "two_wheeler", "four_wheeler"]),
            "corridor": random.choice(["MG Road", "Outer Ring Road", "Hosur Road", "Mysore Road", None])
        }
        self.client.post(
            "/api/v1/predict/closure",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @task(2)
    def explain_prediction(self):
        if not self.token:
            return
        payload = {
            "event_type": "unplanned",
            "event_cause": random.choice(["vehicle_breakdown", "road_accident", "waterlogging", "protest"]),
            "latitude": random.uniform(12.85, 13.10),
            "longitude": random.uniform(77.45, 77.70),
            "description": f"Incident reported due to {random.choice(['vehicle breakdown', 'severe flooding', 'road closure'])} on major road",
            "crowd_size": random.randint(10, 1000),
            "event_duration": random.uniform(10.0, 120.0),
            "vehicle_type": random.choice(["heavy_vehicle", "two_wheeler", "four_wheeler"]),
            "corridor": random.choice(["MG Road", "Outer Ring Road", "Hosur Road", "Mysore Road", None])
        }
        self.client.post(
            "/api/v1/explain",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @task(2)
    def similarity_search(self):
        if not self.token:
            return
        payload = {
            "event_type": "unplanned",
            "event_cause": random.choice(["vehicle_breakdown", "road_accident", "waterlogging", "protest"]),
            "latitude": random.uniform(12.85, 13.10),
            "longitude": random.uniform(77.45, 77.70),
            "description": f"Incident reported due to {random.choice(['vehicle breakdown', 'severe flooding', 'road closure'])} on major road",
            "crowd_size": random.randint(10, 1000),
            "event_duration": random.uniform(10.0, 120.0),
            "vehicle_type": random.choice(["heavy_vehicle", "two_wheeler", "four_wheeler"]),
            "corridor": random.choice(["MG Road", "Outer Ring Road", "Hosur Road", "Mysore Road", None])
        }
        self.client.post(
            "/api/v1/similarity/search",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @task(1)
    def get_diversion(self):
        if not self.token:
            return
        payload = {
            "event_lat": random.uniform(12.85, 13.10),
            "event_lon": random.uniform(77.45, 77.70),
            "closure_probability": random.uniform(0.1, 0.9),
            "destination_lat": random.uniform(12.85, 13.10),
            "destination_lon": random.uniform(77.45, 77.70)
        }
        self.client.post(
            "/api/v1/routing/diversion",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"}
        )
