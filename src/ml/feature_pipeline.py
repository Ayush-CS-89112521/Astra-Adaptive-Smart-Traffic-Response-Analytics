import os
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import joblib

class FeaturePipeline:
    def __init__(self, model_name='all-MiniLM-L6-v2', device='cpu'):
        self.model_name = model_name
        self.device = device
        self.encoder = None
        
        # Define predictor columns
        self.categorical_features = [
            'event_type', 'event_cause', 'veh_type', 'police_station', 
            'geohash', 'zone', 'gba_identifier', 'junction', 'corridor'
        ]
        self.numerical_features = [
            'hour', 'day_of_week', 'month', 'weekend_flag', 
            'authenticated_encoded', 'latitude_clean', 'longitude_clean'
        ]
        
    def _init_encoder(self):
        if self.encoder is None:
            # Load local model or download if first time
            self.encoder = SentenceTransformer(self.model_name, device=self.device)
            
    def get_feature_names(self, include_embeddings=True):
        names = self.categorical_features + self.numerical_features
        if include_embeddings:
            names += [f"emb_{i}" for i in range(384)]
        return names
        
    def fit_transform(self, df_preprocessed, save_encoder_path=None):
        """Prepares feature matrix X and targets y. Computes embeddings."""
        self._init_encoder()
        
        # Extract base features
        X_tabular = df_preprocessed[self.categorical_features + self.numerical_features].copy()
        
        # Enforce categoricals as category dtype or string
        for col in self.categorical_features:
            X_tabular[col] = X_tabular[col].astype(str)
            
        # Compute embeddings for description
        descriptions = df_preprocessed['description'].fillna("").tolist()
        embeddings = self.encoder.encode(descriptions, show_progress_bar=True, convert_to_numpy=True)
        
        # Convert embeddings to dataframe
        emb_cols = [f"emb_{i}" for i in range(embeddings.shape[1])]
        X_emb = pd.DataFrame(embeddings, columns=emb_cols, index=df_preprocessed.index)
        
        # Combine tabular and text features
        X = pd.concat([X_tabular, X_emb], axis=1)
        
        # Save encoder if path provided
        if save_encoder_path:
            os.makedirs(os.path.dirname(save_encoder_path), exist_ok=True)
            joblib.dump(self.encoder, save_encoder_path)
            
        return X

    def transform(self, df_preprocessed):
        """Transform single instance or small batch during inference."""
        self._init_encoder()
        
        X_tabular = df_preprocessed[self.categorical_features + self.numerical_features].copy()
        for col in self.categorical_features:
            X_tabular[col] = X_tabular[col].astype(str)
            
        descriptions = df_preprocessed['description'].fillna("").tolist()
        embeddings = self.encoder.encode(descriptions, show_progress_bar=False, convert_to_numpy=True)
        
        emb_cols = [f"emb_{i}" for i in range(embeddings.shape[1])]
        X_emb = pd.DataFrame(embeddings, columns=emb_cols, index=df_preprocessed.index)
        
        X = pd.concat([X_tabular, X_emb], axis=1)
        return X
