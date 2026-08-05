import os
import chromadb
from sentence_transformers import SentenceTransformer
import mlflow

class AstroEngine:
    def __init__(self, db_path="zet/chroma_db", model_name="all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.db_path = db_path
        
        # Initialize model
        print(f"Loading embedding model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        
        # Initialize ChromaDB
        print(f"Connecting to ChromaDB at {db_path}...")
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_collection("zet_interpretations")
        
        # Define relevant subjects for daily scheduling to filter out noise
        self.daily_relevant_subjects = [
            'Transit', 'Moon Days', 'Transit aspects', 
            'Transit by house', 'Sunny day', 'Transit - Business',
            'Transit - Health', 'Transit - Love and family'
        ]

    def query_advice(self, user_prompt, active_transits=None, top_k=5):
        """
        Improved Transit-First reasoning:
        1. If active_transits provided, fetch ALL texts with those tags.
        2. Rank these texts semantically against user_prompt.
        3. Fallback to general semantic search if no specific transit match found.
        """
        matches = []
        
        def normalize_score(raw_dist):
            # dist usually between 0.3 (great) and 0.8 (poor)
            raw = 1.0 - raw_dist
            # Boost score so ~0.4 -> ~0.75, which makes more sense for percentage display
            norm = raw * 1.5 + 0.3
            return min(1.0, max(0.0, norm))

        # Adjust score logic
        if active_transits:
            print(f"Flexible filtering by active transits: {active_transits}")
            
            query_embedding = self.model.encode([user_prompt])[0].tolist()
            
            transit_query = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=100,
                where={"subject": {"$in": self.daily_relevant_subjects}},
                include=["documents", "metadatas", "distances", "embeddings"]
            )
            
            if transit_query['documents']:
                docs = transit_query['documents'][0]
                metas = transit_query['metadatas'][0]
                distances = transit_query['distances'][0]
                
                for idx, meta in enumerate(metas):
                    tag = str(meta.get('tag', '')).upper()
                    for t_req in active_transits:
                        req_norm = t_req.replace('<<<', '').replace('>>>', '').replace('[', '').replace(']', '').upper()
                        req_parts = [p.strip() for p in req_norm.split('.') if len(p.strip()) > 0]
                        
                        if all(p in tag for p in req_parts):
                            matches.append({
                                "text": docs[idx],
                                "metadata": meta,
                                "relevance": "transit_fuzzy_match",
                                "score": normalize_score(distances[idx]),
                                "vector": (transit_query['embeddings'][0][idx][:64]).tolist() if transit_query.get('embeddings') is not None else []
                            })
                            break
                    if len(matches) >= top_k:
                        break

        # Fallback to general semantic search
        if len(matches) < top_k:
            remaining = top_k - len(matches)
            query_embedding = self.model.encode([user_prompt]).tolist()
            
            semantic_results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=remaining + len(matches), 
                where={"subject": {"$in": self.daily_relevant_subjects}},
                include=["documents", "metadatas", "distances", "embeddings"]
            )
            
            for i in range(len(semantic_results['documents'][0])):
                doc_id = semantic_results['ids'][0][i]
                if any(m['metadata'].get('id') == doc_id for m in matches):
                    continue
                    
                matches.append({
                    "text": semantic_results['documents'][0][i],
                    "metadata": semantic_results['metadatas'][0][i],
                    "relevance": "semantic_fallback",
                    "score": normalize_score(semantic_results['distances'][0][i]),
                    "vector": (semantic_results['embeddings'][0][i][:64]).tolist() if semantic_results.get('embeddings') is not None else []
                })
                
                if len(matches) >= top_k:
                    break
        
        # Sort by score descending to be safe
        matches.sort(key=lambda x: x['score'], reverse=True)
        
        print(f"✅ Found {len(matches)} matches. Top score: {matches[0]['score'] if matches else 'N/A'}")
        return matches

if __name__ == "__main__":
    # Test stub
    engine = AstroEngine()
    test_results = engine.query_advice("собеседование с рекрутером")
    for r in test_results[:3]:
        print(f"[{r['metadata']['author']} - {r['metadata']['subject']}]")
        print(f"Tag: {r['metadata']['tag']}")
        print(f"Text: {r['text'][:200]}...")
        print("-" * 20)
