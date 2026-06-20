import pandas as pd
import numpy as np
import pygeohash as pgh

def clean_target_priority(df):
    """Clean the priority target column, mapping to binary or categorical values."""
    if 'priority' in df.columns:
        # Impute missing values with mode ('High')
        df['priority'] = df['priority'].fillna('High')
        # Map to 1 for High, 0 for Low
        df['priority_encoded'] = df['priority'].map({'High': 1, 'Low': 0})
    return df

def clean_target_closure(df):
    """Clean the road closure target column."""
    if 'requires_road_closure' in df.columns:
        df['requires_road_closure'] = df['requires_road_closure'].astype(bool)
        df['closure_encoded'] = df['requires_road_closure'].astype(int)
    return df

def extract_temporal_features(df):
    """Extract temporal features from start_datetime."""
    if 'start_datetime' in df.columns:
        dt_col = pd.to_datetime(df['start_datetime'], errors='coerce')
        df['hour'] = dt_col.dt.hour.fillna(12).astype(int)
        df['day_of_week'] = dt_col.dt.dayofweek.fillna(0).astype(int)
        df['month'] = dt_col.dt.month.fillna(6).astype(int)
        df['weekend_flag'] = (df['day_of_week'] >= 5).astype(int)
    return df

def extract_spatial_features(df, geohash_precision=6):
    """Convert coordinates to geohash strings and compute other spatial categories."""
    if 'latitude' in df.columns and 'longitude' in df.columns:
        # Handle coordinate imputation/bounds checking
        df['latitude_clean'] = df['latitude'].fillna(12.9716) # Bengaluru default center
        df['longitude_clean'] = df['longitude'].fillna(77.5946)
        
        # Geohash generation
        df['geohash'] = df.apply(
            lambda row: pgh.encode(row['latitude_clean'], row['longitude_clean'], precision=geohash_precision), 
            axis=1
        )
    return df

def preprocess_categoricals(df):
    """Impute missing categoricals and standardize formats."""
    # Impute missing columns
    df['veh_type'] = df['veh_type'].fillna('unknown').astype(str).str.lower().str.strip()
    df['event_type'] = df['event_type'].fillna('unplanned').astype(str).str.lower().str.strip()
    df['event_cause'] = df['event_cause'].fillna('others').astype(str).str.lower().str.strip()
    df['police_station'] = df['police_station'].fillna('unknown').astype(str).str.strip()
    df['zone'] = df['zone'].fillna('Unknown').astype(str).str.strip()
    df['gba_identifier'] = df['gba_identifier'].fillna('Unknown').astype(str).str.strip()
    df['junction'] = df['junction'].fillna('Unknown').astype(str).str.strip()
    df['corridor'] = df['corridor'].fillna('Non-corridor').astype(str).str.strip()
    
    # Authenticated mapping
    if 'authenticated' in df.columns:
        df['authenticated_encoded'] = df['authenticated'].map({'yes': 1, 'no': 0}).fillna(1).astype(int)
    else:
        df['authenticated_encoded'] = 1
        
    return df

def run_preprocessing_pipeline(df, geohash_precision=6):
    """Run full preprocessing pipeline on the dataframe."""
    df = df.copy()
    df = clean_target_priority(df)
    df = clean_target_closure(df)
    df = extract_temporal_features(df)
    df = extract_spatial_features(df, geohash_precision)
    df = preprocess_categoricals(df)
    
    # Clean description
    df['description'] = df['description'].fillna("")
    
    return df
