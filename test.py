import requests

class AbusiveExperienceReportAPI:
    def __init__(self, api_key):
        self.base_url = "https://abusiveexperiencereport.googleapis.com/"
        self.api_key = api_key

    def build_url(self, path):
        return f"{self.base_url}{path}"

    def call_api_method(self, method, params=None):
        url = self.build_url(method["path"])
        headers = {"Content-Type": "application/json"}

        if params is None:
            params = {}
            
        params["key"] = self.api_key  # Add API key to every request

        response = requests.get(url, headers=headers, params=params)

        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error {response.status_code}: {response.text}")
            return None

    def get_site_summary(self, site_name):
        method = {
            "id": "abusiveexperiencereport.sites.get",
            "path": "v1/{+name}",
            "httpMethod": "GET",
        }
        params = {"name": f"sites/{site_name}"}
        return self.call_api_method(method, params)

    def list_violating_sites(self):
        method = {
            "id": "abusiveexperiencereport.violatingSites.list",
            "path": "v1/violatingSites",
            "httpMethod": "GET",
        }
        return self.call_api_method(method)

# Example usage:
api_key = "AIzaSyA99wc9m3mPWjSHoKsot6PANdvKqkoZTtU"
abusive_api = AbusiveExperienceReportAPI(api_key)

# Example 1: Get site summary
site_name = "http%3A%2F%2Fwww.google.com%2F"
site_summary = abusive_api.get_site_summary(site_name)
print("Site Summary:", site_summary)

# Example 2: List violating sites
violating_sites = abusive_api.list_violating_sites()
print("Violating Sites:", violating_sites)
