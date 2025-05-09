from google_cloud.client import upload_cs_file, download_cs_file, delete_cs_file, BUCKET_NAME
from services.image_service import add_image, delete_image, get_image, get_user_images, get_feed_images
from database import get_db_session
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi import APIRouter, File, UploadFile, Depends
from sqlalchemy.orm import Session
import os
from google.cloud import storage
import shutil
import uuid

router = APIRouter(prefix="/image", tags=["image"])

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user_id: int = 1, description: str = None, db: Session = Depends(get_db_session)):
    try:
        temp_filename = f"temp_{uuid.uuid4().hex}_{file.filename}"

        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Upload to GCS
        gcs_filename = f"uploads/{uuid.uuid4().hex}_{file.filename}" 
        public_url = upload_cs_file(BUCKET_NAME, temp_filename, gcs_filename)

        os.remove(temp_filename)
     
        add_image(db, user_id, public_url, description)
        
        return JSONResponse(content={"status": "success", "public_url": public_url})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@router.delete("/delete/{image_id}")

async def delete_file(image_id: int, db: Session = Depends(get_db_session)):
    image = get_image(db, image_id)
    if not image:
        return JSONResponse(status_code=404, content={"error": "Image not found"})
    else:   
        try:
            # Delete from GCS
            delete_cs_file(BUCKET_NAME, image.image_url.split("/")[-1])
            # Delete from DB
            delete_image(db, image_id)       
            return JSONResponse(content={"status": "success", "message": "Image deleted successfully"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})
        

@router.get("/images/{user_id}")
async def get_images(user_id: int, db: Session = Depends(get_db_session)):
    """
    Fetch all images for a specific user to display them on the page
    """
    try:
        images = get_user_images(db, user_id)
        if not images:
            return JSONResponse(content={"status": "success", "images": []})
        
        # Convert images to a list of dictionaries with relevant information
        image_list = [
            {
                "id": image.id,
                "url": image.image_url,
                "description": image.description,
            }
            for image in images
        ]
        
        return JSONResponse(content={"status": "success", "images": image_list})
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/image/{image_id}")
async def get_single_image(image_id: int, db: Session = Depends(get_db_session)):
    """
    Fetch a specific image by its ID
    """
    try:
        image = get_image(db, image_id)
        if not image:
            return JSONResponse(status_code=404, content={"error": "Image not found"})
        
        image_data = {
            "id": image.id,
            "url": image.image_url,
            "description": image.description,
            "user_id": image.user_id
        }
        
        return JSONResponse(content={"status": "success", "image": image_data})
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@router.get("/feed")
async def get_feed(
    limit: int = 20, 
    offset: int = 0, 
    search_term: str = None,
    db: Session = Depends(get_db_session)
):
    """
    Get images for the feed with optional search and pagination
    """
    try:
        images = get_feed_images(db, limit, offset, search_term)
        
        # Convert images to a list of dictionaries with relevant information
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