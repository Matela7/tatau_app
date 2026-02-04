from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from models.base import Base
import datetime


class Comment(Base):

    __tablename__ = 'comments'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    image_id = Column(Integer, ForeignKey('images.id'))
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="comments")
    image = relationship("Image", back_populates="comments")