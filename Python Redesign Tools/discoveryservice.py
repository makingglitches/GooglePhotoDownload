# Author: ChatGPT V3.5
# Description: Script to discover all Google APIs and their versions
# Date: 2023-11-28 12:34:56
# Edited by John R Sohn, initial version didn't work.

import json
import requests
from datetime import datetime

def get_google_apis():
    discovery_url = 'https://www.googleapis.com/discovery/v1/apis'
    response = requests.get(discovery_url)
    api_list = response.json()
    return api_list['items']

if __name__ == "__main__":
    # System date and time
    system_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # List of all Google APIs and versions
    all_google_apis = get_google_apis()

    print("# Author: ChatGPT V3.5")
    print("# Description: Script to discover all Google APIs and their versions")
    print(f"# Date: {system_date}\n")

    print("# List of all Google APIs and versions:")
    for api in all_google_apis:
        print(f"{{'name': '{api['name']}', 'version': '{api['version']}'}}")
