from fastapi import FastAPI
from database import engine
import models  # ensures models are registered

app = FastAPI(title="GVP Academic Analytics Backend")


@app.on_event("startup")
def startup():
    # ⛔ DO NOT create tables again
    # Database already exists and is stable
    pass


@app.get("/")
def root():
    return {"message": "Backend connected to database successfully"}
