import os
import mlflow
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Astro-ML Service")

# Initialize MLflow
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "file:///tmp/mlruns")
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

from scripts.ml.engine import AstroEngine

app = FastAPI(title="Astro-ML Service")

# Initialize Engine (In a real app, you might want to do this lazily or at startup)
# We load it here so it's ready for the first request
engine = None

class QueryRequest(BaseModel):
    prompt: str
    active_transits: Optional[List[str]] = None
    top_k: Optional[int] = 5

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Astro-ML"}

@app.post("/predict")
async def predict(request: QueryRequest):
    global engine
    if engine is None:
        engine = AstroEngine(db_path="zet/chroma_db")
        
    try:
        with mlflow.start_run(run_name="api_prediction"):
            results = engine.query_advice(
                user_prompt=request.prompt,
                active_transits=request.active_transits,
                top_k=request.top_k
            )

            mlflow.log_params({
                "prompt": request.prompt,
                "transits_count": len(request.active_transits) if request.active_transits else 0
            })

            # Serialize numpy arrays to plain Python types
            clean_results = []
            for r in results:
                clean_results.append({
                    "text": str(r.get("text", "")),
                    "metadata": {k: str(v) for k, v in (r.get("metadata") or {}).items()},
                    "relevance": str(r.get("relevance", "")),
                    "score": float(r.get("score", 0)),
                    "vector": [float(x) for x in (r.get("vector") or [])],
                })

            return {
                "success": True,
                "results": clean_results
            }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
