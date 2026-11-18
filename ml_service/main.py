from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from ml_service.api.routes import router as api_router
from ml_service.api.engine_adapter import router as engine_router

app = FastAPI(
    title="MarketMind ML & RAG Microservice",
    description="Python FastAPI service developed by Piyush Rajurkar for Natural-Language Stock News Analysis, FinBERT Sentiment & Causal Analysis, Signal Agreement, and Time-Constrained RAG Causal Synthesis.",
    version="2.0.0"
)

# Enable CORS for frontend and external integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(engine_router)

# Mount static files directory if present
STATIC_DIR = Path(__file__).parent / "static"
INDEX_FILE = STATIC_DIR / "index.html"

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", tags=["Dashboard & UI"], response_class=HTMLResponse)
@app.get("/dashboard", tags=["Dashboard & UI"], response_class=HTMLResponse)
def dashboard(request: Request):
    """Serves the interactive Natural-Language Stock Analysis Web Dashboard."""
    # If client explicitly requests JSON (e.g. API health probes)
    accept = request.headers.get("accept", "")
    if "application/json" in accept and "text/html" not in accept:
        return {
            "service": "MarketMind ML & RAG Microservice",
            "lead": "Piyush Rajurkar",
            "status": "online",
            "docs_url": "/docs"
        }
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return HTMLResponse("<h1>MarketMind ML Service Online</h1><p>Visit <a href='/docs'>/docs</a> for API specifications.</p>")


@app.get("/health", tags=["Health & Info"])
def health_check():
    return {
        "status": "UP",
        "engine_status": "OK",
        "version": "2.0.0",
        "service": "marketmind-ml-service",
        "modules": [
            "QueryUnderstandingService",
            "StockResolutionService",
            "DateResolutionService",
            "IntentClassifierService",
            "HistoricalNewsRetriever",
            "FinBertNewsAnalyzer",
            "EvidenceBasedExplanationEngine",
            "TimeConstrainedRAGEngine",
            "EngineAdapter"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_service.main:app", host="0.0.0.0", port=8000, reload=True)
