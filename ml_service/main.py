from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ml_service.api.routes import router as api_router

app = FastAPI(
    title="MarketMind ML & RAG Microservice",
    description="Python FastAPI service developed by Piyush Rajurkar for Price Classification, FinBERT Sentiment & Causal Analysis, Signal Agreement, and Time-Constrained RAG Causal Synthesis.",
    version="1.0.0"
)

# Enable CORS for Spring Boot & React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", tags=["Health & Info"])
def root():
    return {
        "service": "MarketMind ML & RAG Microservice",
        "lead": "Piyush Rajurkar",
        "status": "online",
        "docs_url": "/docs"
    }


@app.get("/health", tags=["Health & Info"])
def health_check():
    return {
        "status": "UP",
        "version": "1.0.0",
        "service": "marketmind-ml-service"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_service.main:app", host="0.0.0.0", port=8000, reload=True)
