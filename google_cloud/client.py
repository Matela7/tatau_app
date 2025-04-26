from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import os
from google.cloud import storage
import shutil
import uuid

# set key credentials file path
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r'C:\Users\miche\Desktop\tatau_app\key.json'
BUCKET_NAME = 'tatau_app'

def upload_cs_file(bucket_name, source_file_name, destination_file_name): 
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)

    blob = bucket.blob(destination_file_name)
    blob.upload_from_filename(source_file_name)

    blob.make_public()
    return blob.public_url

def download_cs_file(bucket_name, file_name, destination_file_name): 
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)

    blob = bucket.blob(file_name)
    blob.download_to_filename(destination_file_name)

    return True

def delete_cs_file(bucket_name, file_name): 
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)

    blob = bucket.blob(file_name)
    blob.delete()

    return True


# upload_cs_file('tatau_app', "C:\\Users\\miche\\Downloads\\W4slpg-post.jpg", 'dupa.jpg')
# download_cs_file('tatau_app', 'dupa.jpg', "C:\\Users\\miche\\Downloads\\dupa.jpg")