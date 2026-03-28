"use client";

import { useState } from "react";

export default function SetupPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [org, setOrg] = useState("");

  const manifest = (url: string) =>
    JSON.stringify({
      name: "Authorator",
      url: url,
      hook_attributes: {
        url: `${url}/api/github/webhooks`,
        active: true,
      },
      redirect_url: `${url}/setup/callback`,
      callback_urls: [`${url}/setup/callback`, `${url}/api/auth/github/callback`],
      public: false,
      default_permissions: {
        contents: "write",
        issues: "write",
        pull_requests: "write",
        metadata: "read",
      },
      default_events: ["push", "pull_request", "create"],
    });

  const actionUrl = org
    ? `https://github.com/organizations/${org}/settings/apps/new`
    : "https://github.com/settings/apps/new";

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Authorator Setup</h1>
          <p className="text-gray-400">GitHub App を自動作成します</p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Base URL */}
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">
              Step 1: デプロイ先 URL
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Vercel にデプロイ済みの URL、またはローカルテスト用の smee.io URL を入力
            </p>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="https://authrator.vercel.app"
            />
          </div>

          {/* Step 2: Org (optional) */}
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">
              Step 2: Organization (任意)
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Organization の App として作成する場合は org 名を入力。個人アカウントなら空欄。
            </p>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="your-org-name (空欄なら個人アカウント)"
            />
          </div>

          {/* Step 3: Create */}
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">
              Step 3: GitHub App を作成
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              ボタンを押すと GitHub に遷移し、必要な権限が設定済みの App が自動で作成されます。
              作成後、クレデンシャルが表示されます。
            </p>

            {baseUrl ? (
              <form action={actionUrl} method="post">
                <input
                  type="hidden"
                  name="manifest"
                  value={manifest(baseUrl.replace(/\/$/, ""))}
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  GitHub App を作成する
                </button>
              </form>
            ) : (
              <button
                disabled
                className="w-full py-3 bg-gray-700 text-gray-400 rounded-lg font-medium cursor-not-allowed"
              >
                まず URL を入力してください
              </button>
            )}
          </div>

          {/* Info */}
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">自動設定される権限:</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>Contents: Read & Write (push リバート用)</li>
              <li>Issues: Read & Write (コメント投稿用)</li>
              <li>Pull Requests: Read & Write (マージ監視用)</li>
              <li>Events: push, pull_request, create</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
