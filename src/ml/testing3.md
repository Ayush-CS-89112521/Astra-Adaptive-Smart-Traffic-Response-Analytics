# ASTRA v1 — Validation & Testing Framework

## Adaptive Smart Traffic Response & Analytics

Version: 1.0

Purpose:
This document defines the evaluation, validation, robustness testing, stress testing, explainability verification, and acceptance criteria for all machine learning components used in ASTRA.

---

# Validation Philosophy

ASTRA is a decision-support platform.

Incorrect recommendations can result in:

* Wrong officer allocation
* Incorrect diversion plans
* Operational delays
* Reduced trust from traffic operators

Therefore:

A model is never accepted based solely on accuracy.

Every model must pass:

1. Statistical Validation
2. Generalization Validation
3. Explainability Validation
4. Robustness Testing
5. Operational Scenario Testing

---

# Validation Dataset Strategy

## Training Dataset

Used for model fitting.

Never used for reporting final performance.

---

## Cross Validation Dataset

Method:

```text
Stratified K-Fold
K = 5
Shuffle = True
Random State = 42
```

Purpose:

* Model selection
* Hyperparameter tuning
* Stability verification

---

## Out-of-Fold (OOF) Predictions

OOF predictions are considered the primary source of truth.

Every sample must be predicted by a model that has never seen that sample during training.

---

## Holdout Validation

Optional.

Used only as final verification.

Never used for tuning.

---

# Model 1 — Severity Prediction Validation

## Objective

Predict:

```text
Low Priority
High Priority
```

---

## Primary Metrics

### Macro F1 Score

Reason:

Balances performance across classes.

Target:

```text
F1 > 0.90
```

---

### Precision

Target:

```text
Precision > 0.90
```

---

### Recall

Target:

```text
Recall > 0.90
```

---

### Confusion Matrix

Must verify:

* Low incidents are not overclassified as High.
* High incidents are not missed.

---

## Stress Tests

### Test A

Force all corridor values to Unknown.

Expected:

Performance degradation < 15%.

---

### Test B

Remove geohash feature.

Expected:

Model still functions.

Performance degradation acceptable.

---

### Test C

Randomly corrupt 10% coordinates.

Expected:

Prediction stability remains acceptable.

---

# Model 2 — Road Closure Prediction Validation

## Objective

Predict:

```text
TRUE
FALSE
```

for road closure requirement.

---

## Primary Metrics

### PR-AUC

Primary metric.

Reason:

Dataset is highly imbalanced.

Target:

```text
PR-AUC > Baseline
```

---

### Closure Recall

Most important metric.

Reason:

Missing a true closure is operationally expensive.

Target:

```text
Recall > 0.50
```

---

### Closure Precision

Target:

```text
Precision > 0.25
```

---

### F1 Score

Target:

```text
F1 > 0.35
```

---

## OOF Confusion Matrix Review

Current Reference:

```text
TN = 6712
FP = 785

FN = 293
TP = 383
```

Interpretation:

* Model detects majority of closures.
* False positives remain acceptable.
* Future iterations should prioritize reducing FN.

---

# Model 3 — Similarity Engine Validation

## Objective

Retrieve historically similar incidents.

---

## Evaluation Method

Human relevance verification.

---

### Precision@1

Target:

```text
P@1 > 0.70
```

---

### Precision@3

Target:

```text
P@3 > 0.65
```

---

### Precision@5

Target:

```text
P@5 > 0.60
```

---

## Manual Review Protocol

Randomly sample:

```text
50 incidents
```

For each incident:

Verify:

* Similar event cause
* Similar vehicle type
* Similar operational outcome
* Similar location characteristics

---

## Failure Criteria

Returned incidents are:

* Semantically unrelated
* Different operational categories
* Different incident classes

---

# Spatial Intelligence Validation

## Objective

Validate hotspot discovery.

---

## Cluster Quality Checks

Review:

```text
HDBSCAN Cluster Count
Cluster Density
Noise Percentage
```

---

## Manual GIS Review

For each hotspot:

Verify:

* Matches known corridors
* Matches high incident density regions
* Matches operational intuition

---

## Failure Criteria

Clusters appear:

* Random
* Fragmented
* Non-interpretable

---

# Explainability Validation

## SHAP Verification

For every prediction:

Display:

* Top positive contributors
* Top negative contributors

---

## Human Validation

Traffic operator should be able to answer:

```text
Why did ASTRA make this prediction?
```

within 30 seconds.

---

# Robustness Testing

## Missing Data Test

Inject:

```text
10%
20%
30%
```

missing values.

Verify:

* System remains operational
* No crashes
* Graceful degradation

---

## Coordinate Drift Test

Shift coordinates:

```text
100m
250m
500m
```

Verify:

* Predictions remain stable.

---

## Unknown Category Test

Inject unseen:

```text
event_cause
veh_type
police_station
```

Verify:

* CatBoost handles inference successfully.

---

# Adversarial Scenario Testing

## Scenario 1

Vehicle Breakdown

Heavy Vehicle

Major Corridor

Peak Hour

Expected:

* High Severity
* Possible Closure

---

## Scenario 2

Private Car

Minor Road

Off Peak

Expected:

* Low Severity
* No Closure

---

## Scenario 3

Construction Event

Road Closure Flag

CBD Corridor

Expected:

* High Severity
* Closure Probability High

---

# Backend Integration Testing

Verify:

## Severity Endpoint

```text
POST /predict/severity
```

Response Time:

```text
< 100ms
```

---

## Closure Endpoint

```text
POST /predict/closure
```

Response Time:

```text
< 100ms
```

---

## Similarity Endpoint

```text
POST /similarity/search
```

Response Time:

```text
< 300ms
```

---

# End-to-End Operational Testing

Simulate:

1. Event Created
2. Severity Predicted
3. Closure Probability Generated
4. Similar Incidents Retrieved
5. Resource Recommendation Generated
6. Dashboard Updated

Expected:

Complete workflow executes successfully.

---

# Acceptance Criteria

ASTRA v1 is considered production-ready only if:

✓ Severity Model passes OOF validation

✓ Closure Model exceeds baseline PR-AUC

✓ Similarity Engine exceeds Precision@3 target

✓ Hotspots validated manually

✓ SHAP explanations generated

✓ All API endpoints operational

✓ End-to-End workflow verified

Only after passing all checks can a model be promoted into the production artifact directory.
