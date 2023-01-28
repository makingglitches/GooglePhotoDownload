# working test of photo api list and oauth in python. sigh.


import requests
import google.auth
import pickle
import os

from google_auth_oauthlib.flow import InstalledAppFlow


flow = InstalledAppFlow.from_client_secrets_file('../client_secrets.json', \
    scopes=['https://www.googleapis.com/auth/photoslibrary.readonly', \
        'https://www.googleapis.com/auth/userinfo.profile', \
        'https://www.googleapis.com/auth/userinfo.email', \
        'openid'])
    

creds = flow.run_local_server(port=8028,open_browser=False, success_message="<b>CLOSE THE BROWSER NOW YOU BASTARD</B>")


endpoint = "https://photoslibrary.googleapis.com/v1/mediaItems"
params = {
    "pageSize": 10,
}

headers = {
    'Authorization': 'Bearer '+ creds.token,
}


response = requests.get(endpoint,headers=headers, params=params)

print (response.json())