# Setup
- Ollama install

    - [Download](https://ollama.com/download/Ollama-darwin.zip)

- Model Download
```
ollama run hf.co/mmnga/cyberagent-DeepSeek-R1-Distill-Qwen-32B-Japanese-gguf:Q8_0

```

- Create venv environment
```
python -m vevn .venv
```
- Activate
```
source .venv/bin/activate
```
- Install dependencies
```
pip install -r requirements.txt
```

- Run Frontend
```
open-webui serve
```

# Uninstall 
This is uninstall command.
```
ollama rm hf.co/mmnga/cyberagent-DeepSeek-R1-Distill-Qwen-32B-Japanese-gguf:Q8_0
```