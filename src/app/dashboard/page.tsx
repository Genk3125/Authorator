"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RepoConfig } from "@/lib/db/schema";

export default function DashboardPage() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [newOwner, setNewOwner] = useState("");
  const [newRepo, setNewRepo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchRepos() {
    const res = await fetch("/api/settings/repos");
    const data = await res.json();
    setRepos(data.repos || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchRepos();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/settings/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: newOwner, repo: newRepo }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    setNewOwner("");
    setNewRepo("");
    fetchRepos();
  }

  async function handleDelete(owner: string, repo: string) {
    if (!confirm(`${owner}/${repo} を削除しますか？`)) return;

    await fetch(`/api/settings/repos/${owner}/${repo}`, {
      method: "DELETE",
    });
    fetchRepos();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Authrator</h1>
          <p className="text-gray-400 text-sm">リポジトリ管理</p>
        </div>
        <Link
          href="/login"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ログアウト
        </Link>
      </div>

      {/* Add repo form */}
      <form onSubmit={handleAdd} className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">リポジトリを追加</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="owner"
            required
          />
          <span className="text-gray-500 self-center">/</span>
          <input
            type="text"
            value={newRepo}
            onChange={(e) => setNewRepo(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="repo"
            required
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            追加
          </button>
        </div>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
      </form>

      {/* Repo list */}
      <div className="space-y-3">
        {repos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            リポジトリが登録されていません
          </div>
        ) : (
          repos.map((config) => (
            <div
              key={`${config.owner}/${config.repo}`}
              className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <Link
                href={`/dashboard/${config.owner}/${config.repo}`}
                className="flex-1"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">
                    {config.owner}/{config.repo}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      config.enabled
                        ? "bg-green-900 text-green-300"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {config.enabled ? "有効" : "無効"}
                  </span>
                  <span className="text-xs text-gray-500">
                    保護: {config.protectedBranches.join(", ")}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(config.owner, config.repo)}
                className="text-gray-500 hover:text-red-400 transition-colors ml-4"
              >
                削除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
