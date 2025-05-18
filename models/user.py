from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from models.base import Base
from models.follow import follows
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    user_type = Column(String)  

    images = relationship("Image", back_populates="owner")
    interactions = relationship("Interaction", back_populates="user")

    following = relationship(
        "User",
        secondary=follows,
        primaryjoin="User.id==follows.c.follower_id",
        secondaryjoin="User.id==follows.c.followed_id",
        backref="followers"
    )