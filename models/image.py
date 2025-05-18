from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from models.base import Base
from models.image_tag import image_tags

class Image(Base):
    __tablename__ = 'images'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    image_url = Column(String)
    description = Column(String)

    owner = relationship("User", back_populates="images")
    
    tags = relationship("Tag", secondary=image_tags, back_populates="images")
    interactions = relationship("Interaction", back_populates="image")