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