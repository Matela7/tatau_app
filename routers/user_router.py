from google_cloud.client import upload_cs_file, download_cs_file, delete_cs_file, BUCKET_NAME
from services.user_service import add_user, delete_user, get_user, get_user_by_username, get_user_by_email, update_user, set_password, check_password, authenticate_user, search_users_by_term
from database import get_db_session
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi import APIRouter, File, UploadFile, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
from google.cloud import storage
import shutil
import uuid

router = APIRouter(prefix="/user", tags=["user"])

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

@router.post("/register_user")
async def register_user(username: str, email: str, password: str, user_type: str, db: Session = Depends(get_db_session)):
    try:
        user = add_user(db, username, email, password, user_type)
        return JSONResponse(content={"status": "success", "user_id": user.id})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    
@router.delete("/delete_user/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db_session)):
    try:
        user = get_user(db, user_id)
        if not user:
            return JSONResponse(status_code=404, content={"error": "User not found"})
        else:   
            delete_user(db, user_id)       
            return JSONResponse(content={"status": "success", "message": "User deleted successfully"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/login_user/")
async def login_user(login_data: LoginRequest, db: Session = Depends(get_db_session)):
    """
    Authenticate a user and return user information if successful
    """
    try:
        user = authenticate_user(db, login_data.username_or_email, login_data.password)
        
        if user:
            # Zwróć podstawowe informacje o użytkowniku
            return JSONResponse(content={
                "status": "success",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "user_type": user.user_type
                }
            })
        else:
            return JSONResponse(
                status_code=401,
                content={"status": "error", "message": "Nieprawidłowa nazwa użytkownika/email lub hasło"}
            )
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Logowanie nie powiodło się: {str(e)}"}
        )

@router.get("/search")
async def search_users(term: str = "", db: Session = Depends(get_db_session)):
    try:
        users = search_users_by_term(db, term)
        if not users:
            return JSONResponse(content={"status": "success", "users": []})
        
        user_list = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "user_type": user.user_type
            }
            for user in users
        ]
        
        return JSONResponse(content={"status": "success", "users": user_list})
    except Exception as e:
        return JSONResponse(
            status_code=500, 
            content={"status": "error", "message": f"Search failed: {str(e)}"}
        )