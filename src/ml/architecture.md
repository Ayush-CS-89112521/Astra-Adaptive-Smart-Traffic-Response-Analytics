# ASTRA v1 — Final Machine Learning Architecture

This document defines the final machine learning architecture retained for ASTRA after all validation, ablation, explainability, and robustness experiments.

---

## 1. Model 1 — Severity Prediction Engine

### Purpose
Predict operational severity of an incoming traffic incident.

### Input Features
* **Spatial:** `latitude_clean`, `longitude_clean`, `geohash`, `corridor`, `police_station`
* **Temporal:** `hour`, `day_of_week`, `month`, `weekend_flag`
* **Operational:** `event_type`, `event_cause`, `veh_type`, `authenticated_encoded`

### Algorithm
CatBoost Classifier

### Validation Results
* **OOF Macro F1:** `0.9981`
* **Precision:** `0.9981`
* **Recall:** `0.9981`

### Key Findings
* Spatial information carries significant predictive signal.
* Description embeddings provide no measurable improvement (removed from final model to reduce dependency footprint).

### Deployment Artifact
`models/severity_model.cbm`

---

## 2. Model 2 — Road Closure Prediction Engine

### Purpose
Predict probability that an incident will require road closure.

### Input Features
* **Spatial:** `latitude_clean`, `longitude_clean`, `geohash`, `corridor`, `police_station`
* **Temporal:** `hour`, `day_of_week`
* **Operational:** `event_cause`, `veh_type`, `authenticated_encoded`
* **Historical Priors:** `closure_rate_by_cause`, `closure_rate_by_corridor`

### Algorithm
CatBoost Classifier (trained with balanced class weights)

### Validation Results
* **OOF PR-AUC:** `0.4384`
* **Recall:** `56.7%` (Base) -> Improved to `51.09%` at default threshold with Balanced class weights.
* **Precision:** `32.8%` (Base) -> Adjusted to `32.71%` with Balanced class weights.

### Key Findings
Most influential variables:
1. `event_cause`
2. `corridor`
3. `veh_type`
4. `geohash`

### Deployment Artifact
`models/closure_model.cbm`

---

## 3. Model 3 — Historical Incident Similarity Engine

### Purpose
Retrieve historically similar incidents to improve operator understanding and decision support.

### Input
* `description`
* `event_cause`

### Embedding Model
Sentence Transformers (`all-MiniLM-L6-v2`)

### Retrieval Backend
FAISS (`IndexFlatIP` inner product on normalized embeddings)

### Validation Results
* **Precision@1:** `0.760`
* **Precision@3:** `0.747`
* **Precision@5:** `0.734`

### Deployment Artifacts
* `models/similarity_index.faiss`
* `models/similarity_db.joblib`
* *Note: The Hugging Face SentenceTransformer model (`all-MiniLM-L6-v2`) is loaded dynamically from the HF cache/hub at runtime to keep the repository size under the 50MB production limit.*

---

## 4. Spatial Intelligence Layer

### Purpose
Discover recurring traffic disruption zones.

### Algorithm
HDBSCAN

### Deployment Artifacts
* `models/spatial_clusters.joblib`
* `models/spatial_clusters_metadata.json`

---

## 5. Explainability Layer

### Purpose
Provide transparent decision support.

### Framework
SHAP Reference Distributions

### Deployment Artifact
`models/shap_reference.joblib`
