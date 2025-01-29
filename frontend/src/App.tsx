import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

interface Message {
  role: string;
  content: string;
}

const App: React.FC = () => {
  const [threads, setThreads] = useState<{ id: string; title: string }[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<string>("");

  // 許可されたファイルのMIMEタイプ
  const allowedMimeTypes = [
    // 画像
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/svg+xml",
    // オフィスファイル
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  // スレッド一覧をロード
  useEffect(() => {
    // ローカルストレージに保存されたスレッドを取得
    const savedThreads = JSON.parse(localStorage.getItem("threads") || "[]");
    setThreads(savedThreads);

    // 最後に開いていたスレッドを取得
    const lastThreadId = localStorage.getItem("currentThreadId");
    if (lastThreadId) {
      setCurrentThreadId(lastThreadId);
      fetchMessages(lastThreadId);
    }
  }, []);

  // スレッドのメッセージを取得
  const fetchMessages = async (threadId: string) => {
    try {
      const res = await axios.get(`${API_URL}/threads/${threadId}`);
      setMessages(res.data.messages);
    } catch (error) {
      console.error("スレッドのメッセージを取得できませんでした。", error);
    }
  };

  // 新しいスレッドを作成
  const createNewThread = () => {
    const newThreadId = `thread-${Date.now()}`;
    const newThread = { id: newThreadId, title: `スレッド ${threads.length + 1}` };

    // スレッド一覧を更新
    const updatedThreads = [...threads, newThread];
    setThreads(updatedThreads);
    localStorage.setItem("threads", JSON.stringify(updatedThreads));

    // 新しいスレッドを選択
    setCurrentThreadId(newThreadId);
    localStorage.setItem("currentThreadId", newThreadId);
    setMessages([]);
  };

  // スレッドを切り替え
  const selectThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    localStorage.setItem("currentThreadId", threadId);
    fetchMessages(threadId);
  };

  // ファイルアップロード
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0] || null;
    if (uploadedFile) {
      // MIMEタイプの検証
      if (!allowedMimeTypes.includes(uploadedFile.type)) {
        alert("画像またはオフィスファイルのみアップロードできます。");
        return;
      }
      setFile(uploadedFile);
    } else {
      setFile(null);
    }
  };

  // メッセージ送信
  const handleSubmit = async () => {
    if (!text.trim() && !file) {
      alert("テキストまたはファイルを入力してください。");
      return;
    }

    const formData = new FormData();

    // スレッドIDを追加
    if (currentThreadId) {
      formData.append("thread_id", currentThreadId);
    }

    // テキストを追加
    if (text.trim()) {
      formData.append(
        "messages",
        JSON.stringify([{ role: "user", content: text }])
      );
    }

    // ファイルを追加
    if (file) {
      formData.append("file", file);
    }

    try {
      const res = await axios.post(`${API_URL}/generate`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // メッセージの更新
      const aiResponse = res.data.messages[res.data.messages.length - 1];
      setMessages([...messages, { role: "user", content: text }, aiResponse]);

      // UIリセット
      setText("");
      setFile(null);
      setResponse("AIの応答が追加されました。");
    } catch (error) {
      console.error("メッセージ送信に失敗しました", error);
      setResponse("エラーが発生しました。");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* サイドバー */}
      <div className="w-1/4 bg-white shadow-lg p-4">
        <h2 className="text-lg font-bold mb-4">スレッド一覧</h2>
        <button
          onClick={createNewThread}
          className="w-full bg-green-500 text-white px-4 py-2 rounded-lg mb-4 hover:bg-green-600 transition"
        >
          新しいスレッドを作成
        </button>
        <ul className="space-y-2">
          {threads.map((thread) => (
            <li
              key={thread.id}
              onClick={() => selectThread(thread.id)}
              className={`p-2 rounded cursor-pointer ${
                currentThreadId === thread.id ? "bg-blue-200" : "bg-gray-200"
              } hover:bg-gray-300`}
            >
              {thread.title}
            </li>
          ))}
        </ul>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col">
        {/* チャット履歴 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 mb-2 rounded ${
                msg.role === "user" ? "bg-blue-200 self-end" : "bg-gray-200 self-start"
              }`}
            >
              <strong>{msg.role === "user" ? "あなた" : "AI"}</strong>: {msg.content}
            </div>
          ))}
        </div>

        {/* 入力エリア */}
        <div className="p-4 bg-white shadow-lg">
          {/* テキスト入力 */}
          <textarea
            className="w-full p-2 border rounded-lg mb-4"
            rows={3}
            placeholder="質問を入力してください..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {/* ファイルアップロード */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">ファイルをアップロード:</label>
            <input
              type="file"
              onChange={handleFileUpload}
              accept="image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                アップロードされたファイル: {file.name}
              </p>
            )}
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            送信
          </button>

          {/* AIの応答 */}
          {response && (
            <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg">
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
