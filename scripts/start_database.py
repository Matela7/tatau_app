from sqlalchemy import create_engine, Column, Integer, String, MetaData, Table, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dotenv import load_dotenv
from urllib.parse import urlparse
from datetime import datetime
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.base import Base
from models.user import User
from models.image import Image
from models.interaction import Interaction
from models.follow import follows
from models.image_tag import image_tags
from models.tag import Tag

load_dotenv()

tmpPostgres = urlparse(os.getenv("DATABASE_URL"))

engine = create_engine(
    f"postgresql+psycopg2://{tmpPostgres.username}:{tmpPostgres.password}@{tmpPostgres.hostname}{tmpPostgres.path}?sslmode=require",
    echo=True
)

Session = sessionmaker(bind=engine)
session = Session()

Base.metadata.create_all(engine)
print("Database tables created successfully.")