from transformers import AutoModelForCausalLM, AutoTokenizer, TextStreamer
from accelerate import disk_offload

# モデルのロード（device_mapを指定しない）
model = AutoModelForCausalLM.from_pretrained(
    "cyberagent/DeepSeek-R1-Distill-Qwen-32B-Japanese",
    torch_dtype="auto"
)

# モデルのディスクオフロードを設定
disk_offload(model=model, offload_dir="./.deepseek/offload")

# トークナイザーのロード
tokenizer = AutoTokenizer.from_pretrained("cyberagent/DeepSeek-R1-Distill-Qwen-32B-Japanese")

# ストリーマーの設定
streamer = TextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

# メッセージの設定
messages = [
    {"role": "user", "content": "AIによって私たちの暮らしはどのように変わりますか？"}
]

# 入力IDの生成
input_ids = tokenizer.apply_chat_template(
    messages,
    add_generation_prompt=True,
    return_tensors="pt"
).to(model.device)

# モデルの生成
output_ids = model.generate(
    input_ids,
    max_new_tokens=4096,
    temperature=0.7,
    streamer=streamer
)
