with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

content = content.replace("onSubmit={handleBuild}", "onSubmit={handleGenerate}")
content = content.replace("value={spec}", "value={prompt}")
content = content.replace("onChange={e => setSpec(e.target.value)}", "onChange={e => setPrompt(e.target.value)}")
content = content.replace("disabled={isLoading || !spec.trim()}", "disabled={generating || !prompt.trim()}")
content = content.replace("{isLoading ?", "{generating ?")

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(content)
