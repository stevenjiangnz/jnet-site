from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import os

app = FastAPI(title="User Service", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class User(BaseModel):
    id: Optional[int] = None
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

# Routes
@app.get("/")
def read_root():
    return {"service": "User Service", "status": "running"}

@app.get("/health")
def health_check():
    import json
    from datetime import datetime
    
    # Read version from version.json
    try:
        with open("version.json", "r") as f:
            version_data = json.load(f)
            version = version_data.get("version", "0.1.0")
    except:
        version = "0.1.0"
    
    return {
        "status": "healthy",
        "service": "user-service",
        "version": version,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/users/{user_id}")
def get_user(user_id: int):
    # TODO: Implement database fetch
    return {
        "id": user_id,
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User"
    }

@app.post("/api/users")
def create_user(user: UserCreate):
    # TODO: Implement user creation with database
    return {
        "id": 1,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name
    }

@app.put("/api/users/{user_id}")
def update_user(user_id: int, user_update: UserUpdate):
    # TODO: Implement user update with database
    return {
        "id": user_id,
        "message": "User updated successfully"
    }

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):
    # TODO: Implement user deletion
    return {"message": f"User {user_id} deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)