import os
import sys
sys.path.append(".")
import json
import pandas as pd
import numpy as np
import joblib
from catboost import CatBoostClassifier, Pool
from sentence_transformers import SentenceTransformer
import faiss
from sklearn.cluster import HDBSCAN
from sklearn.model_selection import train_test_split, RepeatedStratifiedKFold
from sklearn.decomposition import PCA
from sklearn.metrics import f1_score, average_precision_score
from src.ml.preprocessing import run_preprocessing_pipeline

def main():
    print("Starting ASTRA v1 Production ML Pipeline Training...")
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(BASE_DIR, "Astram event data_anonymized - Astram event data_anonymizedb40ac87 (1).csv")
    models_dir = os.path.join(BASE_DIR, "models")
    
    # 1. Load Data
    print("Loading raw dataset...")
    df = pd.read_csv(dataset_path)
    # Using geohash_precision=5 to prevent exact spatial memorization and group neighboring areas
    df_pre = run_preprocessing_pipeline(df, geohash_precision=5)
    
    df_pre['priority_encoded'] = df_pre['priority_encoded'].fillna(1).astype(int)
    df_pre['closure_encoded'] = df_pre['closure_encoded'].fillna(0).astype(int)
    
    # Create models directory
    os.makedirs(models_dir, exist_ok=True)
    
    # Compute historical priors for road closures
    print("Computing historical prior closure rates...")
    cause_priors = df_pre.groupby('event_cause')['closure_encoded'].mean().to_dict()
    corridor_priors = df_pre.groupby('corridor')['closure_encoded'].mean().to_dict()
    
    df_pre['closure_rate_by_cause'] = df_pre['event_cause'].map(cause_priors)
    df_pre['closure_rate_by_corridor'] = df_pre['corridor'].map(corridor_priors)
    
    # Save priors mapping
    joblib.dump({
        "cause_priors": cause_priors,
        "corridor_priors": corridor_priors
    }, os.path.join(models_dir, "historical_priors.joblib"))
    
    # 2. Train Severity Model (Pruned Features to prevent overfitting on small data)
    print("Training Model 1: Severity Prediction Engine (Pruned Features)...")
    structured_cols = [
        'event_type', 'event_cause', 'veh_type', 'police_station', 
        'geohash', 'corridor', 'hour', 'day_of_week', 
        'latitude_clean', 'longitude_clean'
    ]
    cat_features = [
        'event_type', 'event_cause', 'veh_type', 'police_station', 
        'geohash', 'corridor'
    ]
    
    X_sev = df_pre[structured_cols].copy()
    for col in cat_features:
        X_sev[col] = X_sev[col].astype(str)
    y_sev = df_pre['priority_encoded'].values
    
    # Train-test split for early stopping
    X_train_sev, X_val_sev, y_train_sev, y_val_sev = train_test_split(
        X_sev, y_sev, test_size=0.2, random_state=42, stratify=y_sev
    )
    
    # Jitter coordinates in the training set to prevent exact coordinate memorization (~100m std)
    noise_std = 0.0009
    np.random.seed(42)
    X_train_sev = X_train_sev.copy()
    X_train_sev['latitude_clean'] = X_train_sev['latitude_clean'].astype(float) + np.random.normal(0, noise_std, size=len(X_train_sev))
    X_train_sev['longitude_clean'] = X_train_sev['longitude_clean'].astype(float) + np.random.normal(0, noise_std, size=len(X_train_sev))
    
    severity_model = CatBoostClassifier(
        iterations=600,
        learning_rate=0.05,
        depth=5,                       # Reduced depth to prevent memorization
        l2_leaf_reg=5.0,               # L2 leaf regularization
        bootstrap_type='Bernoulli',    # Subsampling
        subsample=0.8,                 # Bernoulli bag rate
        random_seed=42,
        verbose=100
    )
    severity_model.fit(
        Pool(X_train_sev, y_train_sev, cat_features=cat_features),
        eval_set=Pool(X_val_sev, y_val_sev, cat_features=cat_features),
        early_stopping_rounds=50
    )
    severity_model.save_model(os.path.join(models_dir, "severity_model.cbm"))
    
    # 3. Train Closure Model (Pruned Features to prevent overfitting on small data)
    print("Training Model 2: Road Closure Prediction Engine (Pruned Features)...")
    closure_cols = [
        'latitude_clean', 'longitude_clean', 'geohash', 'corridor', 'police_station', 
        'hour', 'day_of_week', 'event_cause', 'veh_type',
        'closure_rate_by_cause', 'closure_rate_by_corridor'
    ]
    cat_closure_features = ['geohash', 'corridor', 'police_station', 'event_cause', 'veh_type']
    
    X_cls = df_pre[closure_cols].copy()
    for col in cat_closure_features:
        X_cls[col] = X_cls[col].astype(str)
    y_cls = df_pre['closure_encoded'].values
    
    # Train-test split for early stopping
    X_train_cls, X_val_cls, y_train_cls, y_val_cls = train_test_split(
        X_cls, y_cls, test_size=0.2, random_state=42, stratify=y_cls
    )
    
    # Jitter coordinates in the training set to prevent exact coordinate memorization (~100m std)
    X_train_cls = X_train_cls.copy()
    X_train_cls['latitude_clean'] = X_train_cls['latitude_clean'].astype(float) + np.random.normal(0, noise_std, size=len(X_train_cls))
    X_train_cls['longitude_clean'] = X_train_cls['longitude_clean'].astype(float) + np.random.normal(0, noise_std, size=len(X_train_cls))
    
    closure_model = CatBoostClassifier(
        iterations=600,
        learning_rate=0.05,
        depth=5,                       # Reduced depth to prevent memorization
        l2_leaf_reg=5.0,               # L2 leaf regularization
        bootstrap_type='Bernoulli',    # Subsampling
        subsample=0.8,                 # Bernoulli bag rate
        auto_class_weights='Balanced',
        random_seed=42,
        verbose=100
    )
    closure_model.fit(
        Pool(X_train_cls, y_train_cls, cat_features=cat_closure_features),
        eval_set=Pool(X_val_cls, y_val_cls, cat_features=cat_closure_features),
        early_stopping_rounds=50
    )
    closure_model.save_model(os.path.join(models_dir, "closure_model.cbm"))
    
    # 4. Repeated Cross-Validation Evaluation to measure true generalization
    print("\nEvaluating model generalization with Repeated Stratified K-Fold (5 folds, 3 repeats)...")
    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=42)
    
    # Severity model CV
    sev_cv_scores = []
    for train_idx, val_idx in rskf.split(X_sev, y_sev):
        X_tr, X_va = X_sev.iloc[train_idx].copy(), X_sev.iloc[val_idx].copy()
        y_tr, y_va = y_sev[train_idx], y_sev[val_idx]
        X_tr['latitude_clean'] = X_tr['latitude_clean'].astype(float) + np.random.normal(0, noise_std, size=len(X_tr))
        X_tr['longitude_clean'] = X_tr['longitude_clean'].astype(float) + np.random.normal(0, noise_std, size=len(X_tr))
        
        clf = CatBoostClassifier(
            iterations=150, learning_rate=0.05, depth=5, l2_leaf_reg=5.0,
            bootstrap_type='Bernoulli', subsample=0.8, random_seed=42, verbose=0
        )
        clf.fit(Pool(X_tr, y_tr, cat_features=cat_features))
        preds = clf.predict(X_va)
        sev_cv_scores.append(f1_score(y_va, preds, average='macro'))
    print(f"  => Severity Model 5x3 Repeated CV Macro F1: {np.mean(sev_cv_scores):.4f} +/- {np.std(sev_cv_scores):.4f}")
    
    # Closure model CV
    cls_cv_scores = []
    for train_idx, val_idx in rskf.split(X_cls, y_cls):
        X_tr, X_va = X_cls.iloc[train_idx].copy(), X_cls.iloc[val_idx].copy()
        y_tr, y_va = y_cls[train_idx], y_cls[val_idx]
        X_tr['latitude_clean'] = X_tr['latitude_clean'].astype(float) + np.random.normal(0, noise_std, size=len(X_tr))
        X_tr['longitude_clean'] = X_tr['longitude_clean'].astype(float) + np.random.normal(0, noise_std, size=len(X_tr))
        
        clf = CatBoostClassifier(
            iterations=150, learning_rate=0.05, depth=5, l2_leaf_reg=5.0,
            bootstrap_type='Bernoulli', subsample=0.8, auto_class_weights='Balanced',
            random_seed=42, verbose=0
        )
        clf.fit(Pool(X_tr, y_tr, cat_features=cat_closure_features))
        preds = clf.predict(X_va)
        cls_cv_scores.append(average_precision_score(y_va, preds))
    print(f"  => Closure Model 5x3 Repeated CV PR-AUC: {np.mean(cls_cv_scores):.4f} +/- {np.std(cls_cv_scores):.4f}\n")
    
    # 5. SentenceTransformer model is loaded from cache/hub at runtime to keep repo size under 50MB
    encoder = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
    
    descriptions = df_pre['description'].fillna("").tolist()
    embeddings = encoder.encode(descriptions, show_progress_bar=True, convert_to_numpy=True)
    
    # Apply PCA to reduce description embeddings from 384 to 20 principal components to prevent overfitting
    print("Applying PCA dimensionality reduction to text embeddings...")
    pca = PCA(n_components=20, random_state=42)
    embeddings_reduced = pca.fit_transform(embeddings)
    joblib.dump(pca, os.path.join(models_dir, "pca_transformer.joblib"))
    
    # Build FAISS similarity index
    print("Building FAISS vector index with PCA-reduced embeddings...")
    # Normalize for cosine similarity matching via inner product IndexFlatIP
    embeddings_norm = embeddings_reduced / np.linalg.norm(embeddings_reduced, axis=1, keepdims=True)
    d = embeddings_norm.shape[1] # Should be 20
    index = faiss.IndexFlatIP(d)
    index.add(embeddings_norm.astype(np.float32))
    faiss.write_index(index, os.path.join(models_dir, "similarity_index.faiss"))
    
    # Save the lookup database for index mappings
    df_db = df_pre[['description', 'event_cause', 'priority_encoded', 'closure_encoded']].copy()
    joblib.dump(df_db, os.path.join(models_dir, "similarity_db.joblib"))
    
    # 6. Spatial clustering (HDBSCAN)
    print("Building Spatial Intelligence Layer (HDBSCAN Clustering)...")
    coords = df_pre[['latitude_clean', 'longitude_clean']].values
    hdb = HDBSCAN(min_cluster_size=10, min_samples=5).fit(coords)
    
    joblib.dump(hdb, os.path.join(models_dir, "spatial_clusters.joblib"))
    
    # Generate and save cluster risk metadata with real centroid coordinates
    df_pre['cluster_id'] = hdb.labels_
    cluster_metadata = df_pre.groupby('cluster_id').agg(
        total_incidents=('closure_encoded', 'count'),
        closure_rate=('closure_encoded', 'mean'),
        high_severity_rate=('priority_encoded', 'mean'),
        centroid_lat=('latitude_clean', 'mean'),
        centroid_lon=('longitude_clean', 'mean')
    ).round(6).to_dict(orient='index')
    
    with open(os.path.join(models_dir, "spatial_clusters_metadata.json"), "w") as f:
        json.dump(cluster_metadata, f, indent=4)

        
    # 7. Explainability Layer (SHAP references)
    print("Generating SHAP reference distributions...")
    # Background dataset for SHAP reference (sample of 200 instances)
    np.random.seed(42)
    sample_indices = np.random.choice(len(df_pre), 200, replace=False)
    background_sev = X_sev.iloc[sample_indices]
    background_cls = X_cls.iloc[sample_indices]
    
    joblib.dump({
        "background_sev": background_sev,
        "background_cls": background_cls
    }, os.path.join(models_dir, "shap_reference.joblib"))
    
    # 8. Write metadata.json
    print("Writing metadata.json...")
    metadata = {
        "version": "1.0.0",
        "release_status": "production",
        "severity_model": {
            "algorithm": "CatBoostClassifier",
            "features": structured_cols,
            "target": "priority_encoded"
        },
        "closure_model": {
            "algorithm": "CatBoostClassifier",
            "features": closure_cols,
            "target": "closure_encoded",
            "weights": "Balanced"
        },
        "similarity_engine": {
            "model_name": "all-MiniLM-L6-v2",
            "backend": "FAISS IndexFlatIP",
            "pca_components": 20
        },
        "spatial_clustering": {
            "algorithm": "HDBSCAN",
            "min_cluster_size": 10,
            "min_samples": 5
        }
    }
    with open(os.path.join(models_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    print("ASTRA v1 Production ML Stack successfully trained and exported!")

if __name__ == "__main__":
    main()
