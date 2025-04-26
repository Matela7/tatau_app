from models.image import Image

def add_image(session, user_id, image_url, description=None):
    new_image = Image(user_id=user_id, image_url=image_url, description=description)
    session.add(new_image)
    session.commit()
    return new_image

def delete_image(session, image_id):
    image = session.query(Image).filter_by(id=image_id).first()
    if image:
        session.delete(image)
        session.commit()
        return True
    return False

def get_image(session, image_id):
    return session.query(Image).filter_by(id=image_id).first()

def get_user_images(session, user_id):
    return session.query(Image).filter_by(user_id=user_id).all()