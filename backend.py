from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoProcessor, TextStreamer
import torch
import base64
from io import BytesIO
from PIL import Image
import pandas as pd
import docx
import pptx

# FastAPIアプリ作成
app = FastAPI()

# モデルとトークナイザーのロード（マルチモーダル対応）
model_name = "cyberagent/DeepSeek-R1-Distill-Qwen-32B-Japanese"
model = AutoModelForCausalLM.from_pretrained(model_name, device_map="auto", torch_dtype="auto")
tokenizer = AutoTokenizer.from_pretrained(model_name)
processor = AutoProcessor.from_pretrained(model_name)  # 画像処理
streamer = TextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

# リクエストボディ（テキスト＋オプション画像）
class GenerateRequest(BaseModel):
    messages: List[dict]
    image_base64: Optional[str] = None  # Base64エンコードされた画像データ

# Officeファイルの解析
def extract_text_from_office(file: UploadFile):
    file_extension = file.filename.split(".")[-1]
    text = ""
    images = []

    try:
        if file_extension == "docx":
            doc = docx.Document(file.file)
            text = "\n".join([para.text for para in doc.paragraphs])
            for rel in doc.part.rels:
                if "image" in doc.part.rels[rel].target_ref:
                    image_data = doc.part.rels[rel].target_part.blob
                    images.append(base64.b64encode(image_data).decode("utf-8"))

        elif file_extension == "xlsx":
            df = pd.read_excel(file.file, sheet_name=None)
            text = "\n".join(["\n".join(df[sheet].astype(str).values.flatten()) for sheet in df])

        elif file_extension == "pptx":
            presentation = pptx.Presentation(file.file)
            slides_text = []
            for slide in presentation.slides:
                slide_text = []
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        slide_text.append(shape.text)
                    if hasattr(shape, "image"):
                        img_stream = BytesIO(shape.image.blob)
                        images.append(base64.b64encode(img_stream.getvalue()).decode("utf-8"))
                slides_text.append("\n".join(slide_text))
            text = "\n".join(slides_text)
        else:
            raise HTTPException(status_code=400, detail="対応していないファイル形式です。")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return text, images

# 統合エンドポイント（テキスト・画像・Officeファイル対応）
@app.post("/generate")
async def generate(
    messages: Optional[List[dict]] = None,
    image_base64: Optional[str] = None,
    file: Optional[UploadFile] = None
):
    try:
        input_text = ""
        images = []

        # 1. Officeファイル処理
        if file:
            input_text, images = extract_text_from_office(file)
            messages = [{"role": "user", "content": f"このファイルの内容を要約してください:\n{input_text}"}]

        # 2. テキスト処理
        if messages:
            input_ids = tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                return_tensors="pt"
            ).to(model.device)
        else:
            raise HTTPException(status_code=400, detail="メッセージが必要です。")

        # 3. 画像処理（Base64デコード → PIL変換）
        if image_base64:
            image_data = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_data)).convert("RGB")
            image_inputs = processor(images=image, return_tensors="pt").to(model.device)
        elif images:  # Officeファイル内の画像がある場合
            image_data = base64.b64decode(images[0])
            image = Image.open(BytesIO(image_data)).convert("RGB")
            image_inputs = processor(images=image, return_tensors="pt").to(model.device)
        else:
            image_inputs = None  # 画像なし

        # 4. モデル入力
        inputs = {"input_ids": input_ids}
        if image_inputs:
            inputs.update(image_inputs)

        # 5. 生成
        output_ids = model.generate(
            **inputs,
            max_new_tokens=4096,
            temperature=0.7,
            streamer=streamer
        )

        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
