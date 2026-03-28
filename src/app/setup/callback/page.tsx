"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface AppCredentials {
  id: number;
  slug: string;
  pem: string;
  webhook_secret: string;
  html_url: string;
  client_id: string;
  client_secret: string;
}

export default function SetupCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading...</div>
        </div>
      }
    >
      <SetupCallbackContent />
    </Suspense>
  );
}

function SetupCallbackContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [credentials, setCredentials] = useState<AppCredentials | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("code パラメータがありません");
      setLoading(false);
      return;
    }

    fetch(`/api/setup/exchange?code=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCredentials(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("クレデンシャルの取得に失敗しました");
        setLoading(false);
      });
  }, [code]);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">GitHub App を作成中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <a href="/setup" className="text-blue-400 hover:text-blue-300">
            セットアップに戻る
          </a>
        </div>
      </div>
    );
  }

  if (!credentials) return null;

  const envContent = `APP_ID=${credentials.id}
PRIVATE_KEY="${credentials.pem.replace(/\n/g, "\\n")}"
WEBHOOK_SECRET=${credentials.webhook_secret}
GITHUB_CLIENT_ID=${credentials.client_id}
GITHUB_CLIENT_SECRET=${credentials.client_secret}`;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          GitHub App 作成完了!
        </h1>
        <p className="text-gray-400">
          以下のクレデンシャルを環境変数に設定してください
        </p>
      </div>

      <div className="space-y-6">
        {/* App Info */}
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">App 情報</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">App ID</dt>
              <dd className="text-white font-mono">{credentials.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Slug</dt>
              <dd className="text-white font-mono">{credentials.slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">App URL</dt>
              <dd>
                <a
                  href={credentials.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  GitHub で確認
                </a>
              </dd>
            </div>
          </dl>
        </div>

        {/* ENV vars */}
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">環境変数</h2>
            <button
              onClick={() => copyToClipboard(envContent, "env")}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
            >
              {copied === "env" ? "Copied!" : "全てコピー"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">APP_ID</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-800 rounded text-sm text-green-400 font-mono overflow-x-auto">
                  {credentials.id}
                </code>
                <button
                  onClick={() => copyToClipboard(String(credentials.id), "appid")}
                  className="text-gray-500 hover:text-white text-xs shrink-0"
                >
                  {copied === "appid" ? "OK" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">WEBHOOK_SECRET</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-800 rounded text-sm text-green-400 font-mono overflow-x-auto">
                  {credentials.webhook_secret}
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(credentials.webhook_secret, "secret")
                  }
                  className="text-gray-500 hover:text-white text-xs shrink-0"
                >
                  {copied === "secret" ? "OK" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">PRIVATE_KEY</label>
              <div className="relative">
                <pre className="px-3 py-2 bg-gray-800 rounded text-xs text-green-400 font-mono overflow-x-auto max-h-32 overflow-y-auto">
                  {credentials.pem}
                </pre>
                <button
                  onClick={() => copyToClipboard(credentials.pem, "pem")}
                  className="absolute top-2 right-2 text-gray-500 hover:text-white text-xs"
                >
                  {copied === "pem" ? "OK" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">GITHUB_CLIENT_ID</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-800 rounded text-sm text-green-400 font-mono overflow-x-auto">
                  {credentials.client_id}
                </code>
                <button
                  onClick={() => copyToClipboard(credentials.client_id, "clientid")}
                  className="text-gray-500 hover:text-white text-xs shrink-0"
                >
                  {copied === "clientid" ? "OK" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">GITHUB_CLIENT_SECRET</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-800 rounded text-sm text-green-400 font-mono overflow-x-auto">
                  {credentials.client_secret}
                </code>
                <button
                  onClick={() => copyToClipboard(credentials.client_secret, "clientsecret")}
                  className="text-gray-500 hover:text-white text-xs shrink-0"
                >
                  {copied === "clientsecret" ? "OK" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
          <p className="text-yellow-300 text-sm font-semibold mb-1">
            重要: この Private Key は二度と表示されません
          </p>
          <p className="text-yellow-400/70 text-xs">
            必ず安全な場所に保存してください。Vercel の環境変数に設定後、このページを閉じてください。
          </p>
        </div>

        {/* Next steps */}
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">次のステップ</h2>
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white">1</span>
              上記の環境変数を Vercel (または .env.local) に設定
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white">2</span>
              Upstash Redis の URL / Token も環境変数に追加
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white">3</span>
              <a href={`${credentials.html_url}/installations/new`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                App をリポジトリにインストール
              </a>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white">4</span>
              <a href="/login" className="text-blue-400 hover:text-blue-300">
                ダッシュボードでリポジトリを登録
              </a>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
