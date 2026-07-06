from openai import OpenAI

client = OpenAI(
    api_key="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",
    base_url="https://integrate.api.nvidia.com/v1"
)

res = client.chat.completions.create(
    model="deepseek-ai/deepseek-v4-pro",
    messages=[{"role":"user","content":"Hello"}]
)

print(res.choices[0].message.content)