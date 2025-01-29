from transformers import AutoModelForCausalLM, AutoTokenizer, TextStreamer

model = AutoModelForCausalLM.from_pretrained("cyberagent/DeepSeek-R1-Distill-Qwen-32B-Japanese", device_map="auto", torch_dtype="auto")
tokenizer = AutoTokenizer.from_pretrained("cyberagent/DeepSeek-R1-Distill-Qwen-32B-Japanese")
streamer = TextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

messages = [
    {"role": "user", "content": "AIによって私たちの暮らしはどのように変わりますか？"}
]

input_ids = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt").to(model.device)
output_ids = model.generate(input_ids,
                            max_new_tokens=4096,
                            temperature=0.7,
                            streamer=streamer)
