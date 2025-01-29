import React, { useState } from "react";
import axios from "axios";

const App: React.FC = () => {
  const [text, setText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [response, setResponse] = useState<string>("");

  // 画像のBase64変換
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageBase64(reader.result.split(",")[1]); // "data:image/png;base64," の部分を除去
      }
    };
  };

  // Officeファイルアップロード
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
  };

  // APIリクエスト送信
  const handleSubmit = async () => {
    const formData = new FormData();

    if (file) {
      formData.append("file", file);
    } else {
      formData.append(
        "messages",
        JSON.stringify([{ role: "user", content: text }])
      );
      if (imageBase64) {
        formData.append("image_base64", imageBase64);
      }
    }

    try {
      const res = await axios.post("http://127.0.0.1:8000/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResponse(res.data.status);
    } catch (error) {
      setResponse("エラーが発生しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">マルチモーダル AI API</h1>

      {/* テキスト入力 */}
      <textarea
        className="w-full max-w-lg p-2 border rounded-lg mb-4"
        rows={4}
        placeholder="質問を入力してください..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* 画像アップロード */}
      <input type="file" accept="image/*" onChange={handleImageUpload} className="mb-4" />

      {/* Officeファイルアップロード */}
      <input type="file" accept=".docx,.xlsx,.pptx" onChange={handleFileUpload} className="mb-4" />

      {/* 送信ボタン */}
      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
      >
        送信
      </button>

      {/* AIの応答 */}
      {response && (
        <div className="mt-6 p-4 bg-white shadow rounded-lg w-full max-w-lg">
          <h2 className="text-lg font-semibold">AIの応答:</h2>
          <p className="mt-2">{response}</p>
        </div>
      )}
    </div>
  );
};

export default App;
