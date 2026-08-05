import os
import json
import mlflow
import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer
import pandas as pd
from datetime import datetime
from tqdm import tqdm

# Configuration
DATASET_PATH = "zet/dataset.json"
CHROMA_DB_PATH = "zet/chroma_db"
COLLECTION_NAME = "zet_interpretations"
MODEL_NAME = "all-MiniLM-L6-v2"  # Lightweight and effective for CPU/local
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5001")

def run_pipeline():
    # 1. Setup MLflow
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment("Astro-Data-Engineering")
    
    with mlflow.start_run(run_name=f"Embedding_Pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
        mlflow.log_param("model_name", MODEL_NAME)
        mlflow.log_param("dataset_path", DATASET_PATH)
        
        # 2. Load Data
        print(f"Loading dataset from {DATASET_PATH}...")
        with open(DATASET_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        df = pd.DataFrame(data)
        mlflow.log_metric("total_entries", len(df))
        print(f"Loaded {len(df)} entries.")

        # 3. Initialize Embedding Model
        print(f"Initializing model {MODEL_NAME}...")
        model = SentenceTransformer(MODEL_NAME)
        
        # 4. Initialize ChromaDB
        print(f"Initializing ChromaDB at {CHROMA_DB_PATH}...")
        client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        
        # Delete existing collection if it exists to start fresh
        try:
            client.delete_collection(COLLECTION_NAME)
        except:
            pass
            
        collection = client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

        # 5. Process in batches
        batch_size = 500
        print(f"Processing {len(df)} entries in batches of {batch_size}...")
        
        for i in tqdm(range(0, len(df), batch_size)):
            batch = df.iloc[i:i+batch_size]
            
            # Combine relevant fields for embedding
            # We include author and subject to give the vector more context
            documents = []
            metadatas = []
            ids = []
            
            for idx, row in batch.iterrows():
                # We create a "rich" text for embedding that includes the tag
                rich_text = f"Author: {row.get('author', 'Unknown')}. Tag: {row.get('tag', '')}. Topic: {row.get('subject', '')}. {row['text']}"
                documents.append(rich_text)
                
                # Metadata for filtering later
                metadatas.append({
                    "author": str(row.get("author", "Unknown")),
                    "subject": str(row.get("subject", "Unknown")),
                    "tag": str(row.get("tag", "")),
                    "source": str(row.get("source_file", ""))
                })
                ids.append(f"id_{idx}")
            
            # Generate embeddings
            embeddings = model.encode(documents).tolist()
            
            # Add to collection
            collection.add(
                embeddings=embeddings,
                documents=[row['text'] for _, row in batch.iterrows()], # Store original text
                metadatas=metadatas,
                ids=ids
            )

        mlflow.log_metric("processed_entries", len(df))
        
        # 6. Log Artifacts
        # Note: We don't log the entire DB to mlflow artifacts if it's too big, 
        # but we can log a sample or the schema.
        print("Pipeline finished successfully!")
        
if __name__ == "__main__":
    run_pipeline()
