import openai


f = open("Utilities/sensitivedata/openaikey.txt","r")
key = f.read()
f.close();


print(key)

openai.api_key=key

p = open("UnitTests/prompt.txt","r")

prompt = p.read()
p.close()



completions = openai.Completion.create(
    engine="code-davinci-002",
    prompt=prompt,
    max_tokens=4000,
    n=1,
    stop=None,
    temperature=0.5,
)


outf = open("code.txt","w")
code = completions.choices[0].text
print(code)

outf.write(code)
outf.close()


api_key = openai.api_key

# Define the model and prompt
model_engine = "code-davinci-002"

# Define the list of method names
method_names = ["__init__", "get_media_items", "get_media_item", "create_media_item", "update_media_item", "delete_media_item"]

# Compose the class file
with open("photos_api.py", "w") as class_file:
    class_file.write("class PhotosAPI:\n")
    for method_name in method_names:
        prompt = f"show me the {method_name} method"
        completions = openai.Completion.create(engine=model_engine, prompt=prompt, max_tokens=1024, n=1,stop=None,temperature=0.5, api_key=api_key)
        message = completions.choices[0].text
        class_file.write(message)