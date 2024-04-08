# Author: ChatGPT V3.5
# Description: Script to generate service method functions for discovered Google APIs
# Date: 2023-11-28 12:34:56
# Edited by John R Sohn original version didn't work. also didn't generate jack shit.

import io
import json
import requests
from datetime import datetime

def get_google_apis():
    discovery_url = 'https://www.googleapis.com/discovery/v1/apis'
    response = requests.get(discovery_url)
    api_list = response.json()['items']

    google_apis = [{'name': api['name'], 'version': api['version']}
                   for api in api_list]
                   
    return google_apis

def get_service_methods(api_name, api_version):
    discovery_url = f'https://www.googleapis.com/discovery/v1/apis/{api_name}/{api_version}/rest'
    response = requests.get(discovery_url)
    discovery_document = response.json()

    return discovery_document


def generate_service_methods(api_name, api_version):
    
    discovery_document = get_service_methods(api_name, api_version)

    for path, path_info in discovery_document.get('resources', {}).items():
        for method, method_info in path_info.get('methods', {}).items():
            generate_method_function(api_name, api_version, path, method, method_info)

def generate_method_function(api_name, api_version, path, method, method_info):
    http_method = method_info.get('httpMethod')
    parameters = method_info.get('parameters', [])

    print(f"def {method}_{api_name}_{api_version}(")
    for param in parameters:
        print(f"    {param}: {parameters[param]['type']}")
    print("):")
    print(f"    # Endpoint: {path}")
    print(f"    # HTTP Method: {http_method}")
    print(f"    # API: {api_name} - Version: {api_version}\n")
    print("    # Add your implementation here\n")
    print("    pass\n\n")

if __name__ == "__main__":
    # System date and time
    system_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # List of all Google APIs and versions
    all_google_apis = get_google_apis()

    print("# Author: ChatGPT V3.5")
    print("# Description: Script to generate service method functions for discovered Google APIs")
    print(f"# Date: {system_date}\n")

    for api in all_google_apis:
        print (f"fetching {api['name']}... ")
        api['methods'] = get_service_methods(api['name'], api['version'])

    f = open ('services.json','w')

    f.write(json.dumps(all_google_apis))

    f.flush()

    f.close()    
    