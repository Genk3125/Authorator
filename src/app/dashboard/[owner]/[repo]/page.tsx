"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RepoConfig, ActionLog } from "@/lib/db/schema";

export default function RepoSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const [config, setConfig] = useState<RepoConfig | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form state
  const [newBranch, setNewBranch] = useState("");
  const [newUser, setNewUser] = useState("");
  const [permUser, setPermUser] = useState("");
  const [permBranch, setPermBranch] = useState("");

  const fetchData = useCallback(async () => {
    const [configRes, logsRes] = await Promise.all([
      fetch(`/api/settings/repos/${owner}/${repo}`),
      fetch(`/api/settings/repos/${owner}/${repo}/logs`),
    ]);

    if (!configRes.ok) {
      router.push("/dashboard");
      return;
    }

    const configData = await configRes.json();
    const logsData = await logsRes.json();
    setConfig(configData.config);
    setLogs(logsData.logs || []);
    setLoading(false);
  }, [owner, repo, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveConfig(updated: RepoConfig) {
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/settings/repos/${owner}/${repo}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    const data = await res.json();
    if (res.ok) {
      setConfig(data.config);
      setMessage("保存しました");
      setTimeout(() => setMessage(""), 2000);
    } else {
      setMessage(data.error || "エラーが発生しました");
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          &larr; 戻る
        </Link>
        <h1 className="text-2xl font-bold text-white">
          {owner}/{repo}
        </h1>
        {message && (
          <span className={`text-sm ${message.includes("エラー") || message.includes("見つかりません") ? "text-red-400" : "text-green-400"}`}>{message}</span>
        )}
      </div>

      <div className="space-y-8">
        {/* Enable/Disable */}
        <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Bot 有効/無効</h2>
              <p className="text-sm text-gray-400">無効にすると全ての監視を停止します</p>
            </div>
            <button
              onClick={() => saveConfig({ ...config, enabled: !config.enabled })}
              disabled={saving}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                config.enabled
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              {config.enabled ? "有効" : "無効"}
            </button>
          </div>
        </section>

        {/* Protected Branches */}
        <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">保護ブランチ</h2>
          <p className="text-sm text-gray-400 mb-4">
            glob パターン対応 (例: main, release/*, feature/v2-*)
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {config.protectedBranches.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
              >
                {b}
                <button
                  onClick={() =>
                    saveConfig({
                      ...config,
                      protectedBranches: config.protectedBranches.filter(
                        (x) => x !== b
                      ),
                    })
                  }
                  className="text-gray-500 hover:text-red-400 ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
            {config.protectedBranches.length === 0 && (
              <span className="text-gray-500 text-sm">なし</span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newBranch.trim()) return;
              if (config.protectedBranches.includes(newBranch.trim())) return;
              saveConfig({
                ...config,
                protectedBranches: [...config.protectedBranches, newBranch.trim()],
              });
              setNewBranch("");
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              placeholder="ブランチパターンを追加..."
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              追加
            </button>
          </form>
        </section>

        {/* Authorized Users */}
        <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">権限者</h2>
          <p className="text-sm text-gray-400 mb-4">
            全ての保護ブランチに対するフルアクセス権を持つユーザー
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {config.authorizedUsers.map((u) => (
              <span
                key={u}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
              >
                @{u}
                <button
                  onClick={() =>
                    saveConfig({
                      ...config,
                      authorizedUsers: config.authorizedUsers.filter(
                        (x) => x !== u
                      ),
                    })
                  }
                  className="text-gray-500 hover:text-red-400 ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
            {config.authorizedUsers.length === 0 && (
              <span className="text-gray-500 text-sm">なし</span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const user = newUser.trim().replace(/^@/, "");
              if (!user) return;
              if (config.authorizedUsers.includes(user)) return;
              saveConfig({
                ...config,
                authorizedUsers: [...config.authorizedUsers, user],
              });
              setNewUser("");
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              placeholder="GitHub ユーザー名..."
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              追加
            </button>
          </form>
        </section>

        {/* Per-user Permissions */}
        <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">個別ユーザー権限</h2>
          <p className="text-sm text-gray-400 mb-4">
            非権限者への個別ブランチ編集権限・ブランチ作成権限の付与
          </p>

          {/* Existing permissions */}
          <div className="space-y-3 mb-6">
            {Object.entries(config.userPermissions).map(([username, perms]) => (
              <div
                key={username}
                className="p-4 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">@{username}</span>
                  <button
                    onClick={() => {
                      const updated = { ...config.userPermissions };
                      delete updated[username];
                      saveConfig({ ...config, userPermissions: updated });
                    }}
                    className="text-gray-500 hover:text-red-400 text-sm"
                  >
                    削除
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={perms.canCreateBranch}
                      onChange={(e) => {
                        const updated = {
                          ...config.userPermissions,
                          [username]: {
                            ...perms,
                            canCreateBranch: e.target.checked,
                          },
                        };
                        saveConfig({ ...config, userPermissions: updated });
                      }}
                      className="rounded"
                    />
                    ブランチ作成可
                  </label>
                </div>

                <div className="mt-2">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {perms.allowedBranches.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                      >
                        {b}
                        <button
                          onClick={() => {
                            const updated = {
                              ...config.userPermissions,
                              [username]: {
                                ...perms,
                                allowedBranches: perms.allowedBranches.filter(
                                  (x) => x !== b
                                ),
                              },
                            };
                            saveConfig({ ...config, userPermissions: updated });
                          }}
                          className="text-gray-500 hover:text-red-400"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add permission */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const user = permUser.trim().replace(/^@/, "");
              if (!user) return;

              const existing = config.userPermissions[user] || {
                allowedBranches: [],
                canCreateBranch: false,
              };

              const branch = permBranch.trim();
              const updatedBranches = branch && !existing.allowedBranches.includes(branch)
                ? [...existing.allowedBranches, branch]
                : existing.allowedBranches;

              saveConfig({
                ...config,
                userPermissions: {
                  ...config.userPermissions,
                  [user]: {
                    ...existing,
                    allowedBranches: updatedBranches,
                  },
                },
              });
              setPermUser("");
              setPermBranch("");
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={permUser}
              onChange={(e) => setPermUser(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              placeholder="ユーザー名"
              required
            />
            <input
              type="text"
              value={permBranch}
              onChange={(e) => setPermBranch(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              placeholder="許可ブランチ (任意)"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              追加
            </button>
          </form>
        </section>

        {/* Action Logs */}
        <section className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">アクションログ</h2>

          {logs.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              ログはまだありません
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg text-sm"
                >
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                      log.action === "allowed"
                        ? "bg-green-900 text-green-300"
                        : log.action === "delete_branch"
                        ? "bg-yellow-900 text-yellow-300"
                        : "bg-red-900 text-red-300"
                    }`}
                  >
                    {log.action === "revert_push"
                      ? "REVERT"
                      : log.action === "revert_merge"
                      ? "REVERT"
                      : log.action === "delete_branch"
                      ? "DELETE"
                      : "OK"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-300">{log.reason}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      @{log.user} / {log.branch} / {new Date(log.timestamp).toLocaleString("ja-JP")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
