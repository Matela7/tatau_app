from services.interaction_service import add_interaction
from services.recommendation_service import get_recommendations
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db_session

router = APIRouter(prefix="/interaction", tags=["interaction"])

@router.post("/record-interaction")
async def record_interaction(
    image_id: int,
    user_id: int,
    interaction_type: str,
    db: Session = Depends(get_db_session)
):
    """
    Record user interaction with an image
    """
    try:
        interaction = add_interaction(db, user_id, image_id, interaction_type)
        return JSONResponse(content={"status": "success"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    


@router.get("/feed")
async def get_feed(
    limit: int = 20, 
    offset: int = 0, 
    user_id: int = None,
    db: Session = Depends(get_db_session)
):
    """
    Get personalized feed for a user with recommendations
    """
    try:
        images = get_recommendations(db, user_id, limit)
        image_list = [
            {
                "id": image.id,
                "url": image.image_url,
                "description": image.description,
                "user_id": image.user_id
            }
            for image in images
        ]
        
        return JSONResponse(content={
            "status": "success", 
            "images": image_list,
            "count": len(image_list)
        })
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
