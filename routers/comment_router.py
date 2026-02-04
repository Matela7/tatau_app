from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db_session
from services.comment_service import add_comment, delete_comment, edit_comment, get_comments_for_image
from services.user_service import get_user

router = APIRouter(prefix="/comment", tags=["comment"])


class CommentCreate(BaseModel):
    user_id: int
    image_id: int
    content: str


@router.post("/add")
async def create_comment(payload: CommentCreate, db: Session = Depends(get_db_session)):
    try:
        content = payload.content
        if not content or not content.strip():
            return JSONResponse(status_code=400, content={"status": "error", "message": "Comment cannot be empty"})

        user = get_user(db, payload.user_id)
        if not user:
            return JSONResponse(status_code=404, content={"status": "error", "message": "User not found"})

        comment = add_comment(db, payload.user_id, payload.image_id, content.strip())
        return JSONResponse(content={
            "status": "success",
            "comment": {
                "id": comment.id,
                "user_id": comment.user_id,
                "username": user.username,
                "content": comment.content,
                "timestamp": comment.timestamp.isoformat()
            }
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.get("/image/{image_id}")
async def list_comments(image_id: int, db: Session = Depends(get_db_session)):
    try:
        comments = get_comments_for_image(db, image_id)
        comment_list = [
            {
                "id": c.id,
                "user_id": c.user_id,
                "username": c.user.username if c.user else f"User {c.user_id}",
                "content": c.content,
                "timestamp": c.timestamp.isoformat()
            }
            for c in comments
        ]
        return JSONResponse(content={"status": "success", "comments": comment_list})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.delete("/{comment_id}")
async def remove_comment(comment_id: int, db: Session = Depends(get_db_session)):
    try:
        deleted = delete_comment(db, comment_id)
        if not deleted:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Comment not found"})
        return JSONResponse(content={"status": "success", "message": "Comment deleted"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.put("/{comment_id}")
async def update_comment(comment_id: int, content: str, db: Session = Depends(get_db_session)):
    try:
        if not content or not content.strip():
            return JSONResponse(status_code=400, content={"status": "error", "message": "Comment cannot be empty"})
        updated = edit_comment(db, comment_id, content.strip())
        if not updated:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Comment not found"})
        return JSONResponse(content={"status": "success", "message": "Comment updated"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
