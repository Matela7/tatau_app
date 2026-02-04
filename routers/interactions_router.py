from services.interaction_service import add_interaction, get_interactions
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

@router.get("/image/{image_id}")
async def get_image_interactions(
    image_id: int,
    user_id: int = None,
    db: Session = Depends(get_db_session)
):
    """
    Get all interactions for an image with counts and user status
    """
    try:
        interactions = get_interactions(db, image_id)
        
        # Count interactions by type
        likes = sum(1 for i in interactions if i.interaction_type == 'like')
        comments = sum(1 for i in interactions if i.interaction_type == 'comment')
        saves = sum(1 for i in interactions if i.interaction_type == 'save')
        
        # Check if current user has interacted
        user_liked = False
        user_saved = False
        if user_id:
            user_liked = any(i.user_id == user_id and i.interaction_type == 'like' for i in interactions)
            user_saved = any(i.user_id == user_id and i.interaction_type == 'save' for i in interactions)
        
        return JSONResponse(content={
            "status": "success",
            "likes": likes,
            "comments": comments,
            "saves": saves,
            "user_liked": user_liked,
            "user_saved": user_saved
        })
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
