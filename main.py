from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import Base, User, Image, Tag, Interaction, image_tags
from routers.image_routers import router as image_routers
from routers.user_router import router as user_routers
from routers.interactions_router import router as interaction_routers
from sqlalchemy.orm import configure_mappers
import uvicorn
configure_mappers()

app = FastAPI(
    title="Tatau App API",
    description="API for Tatau Application",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(image_routers)
app.include_router(user_routers)
app.include_router(interaction_routers)

@app.get("/")
async def root():
    return {
        "message": "Witaj w Tatau App API",
        "docs": "/docs",
        "redoc": "/redoc"
    }
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)