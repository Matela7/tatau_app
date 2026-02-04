from models.comment import Comment

def add_comment(session, user_id, image_id, content):
    new_comment = Comment(
        user_id=user_id,
        image_id=image_id,
        content=content
    )
    session.add(new_comment)
    session.commit()
    session.refresh(new_comment)
    return new_comment

def edit_comment(session, comment_id, new_content):
    comment = session.query(Comment).filter_by(id=comment_id).first()
    if comment:
        comment.content = new_content
        session.commit()
        return True
    return False

def delete_comment(session, comment_id):
    comment = session.query(Comment).filter_by(id=comment_id).first()
    if comment:
        session.delete(comment)
        session.commit()
        return True
    return False


def get_comments_for_image(session, image_id):
    return session.query(Comment).filter_by(image_id=image_id).all()