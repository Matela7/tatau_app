from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from models.base import Base
import datetime

class Interaction(Base):
    __tablename__ = 'interactions'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    image_id = Column(Integer, ForeignKey('images.id'))
    interaction_type = Column(String)  # 'view', 'like', 'save', 'comment', etc.
    weight = Column(Float)  # Different interactions have different weights
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="interactions")
    image = relationship("Image", back_populates="interactions")