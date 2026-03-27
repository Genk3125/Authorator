"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RepoConfig } from "@/lib/db/schema";

export default function DashboardPage() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [newOwner, setNewOwner] = useState("");
  const [newRepo, setNewRepo] = useState("");
  const [newAdmin, setNewAdmin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchData() {
    const [reposRes, adminsRes] = await Promise.all([
      fetch("/api/settings/repos"),
      fetch("/api/auth/admins"),
    ]);
    const reposData = await reposRes.json();
    const adminsData = await adminsRes.json();
    setRepos(reposData.repos || []);
    setAdmins(adminsData.admins || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleAddRepo(e: React.FormEvent) {
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
    fetchData();
  }

  async function handleDeleteRepo(owner: string, repo: string) {
    if (!confirm(`${owner}/${repo} を削除しますか？`)) return;
    await fetch(`/api/settings/repos/${owner}/${repo}`, { method: "DELETE" });
    fetchData();
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    const user = newAdmin.trim().replace(/^@/, "");
    if (!user) return;
    await fetch("/api/auth/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user }),
    });
    setNewAdmin("");
    fetchData();
  }

  async function handleRemoveAdmin(username: string) {
    if (!confirm(`@${username} を管理者から外しますか？`)) return;
    const res = await fetch("/api/auth/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error);
      return;
    }
    fetchData();
  }

  function handleLogout() {
    document.cookie = "authrator_token=; path=/; max-age=0";
    router.push("/login");
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
          <h1 className="text-2xl font-bold text-white">Authorator</h1>
          <p className="text-gray-400 text-sm">ダッシュボード</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ログアウト
        </button>
      </div>

      {/* Add repo */}
      <form onSubmit={handleAddRepo} className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
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
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            追加
          </button>
        </div>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
      </form>

      {/* Repo list */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">監視リポジトリ</h2>
        <div className="space-y-3">
          {repos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">リポジトリが登録されていません</div>
          ) : (
            repos.map((config) => (
              <div
                key={`${config.owner}/${config.repo}`}
                className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <Link href={`/dashboard/${config.owner}/${config.repo}`} className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{config.owner}/{config.repo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.enabled ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
                      {config.enabled ? "有効" : "無効"}
                    </span>
                    <span className="text-xs text-gray-500">保護: {config.protectedBranches.join(", ")}</span>
                  </div>
                </Link>
                <button
                  onClick={() => handleDeleteRepo(config.owner, config.repo)}
                  className="text-gray-500 hover:text-red-400 transition-colors ml-4"
                >
                  削除
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Admin users */}
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-2">ダッシュボード管理者</h2>
        <p className="text-sm text-gray-400 mb-4">
          GitHub OAuth でログイン可能な GitHub ユーザー
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {admins.map((u) => (
            <span
              key={u}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
            >
              @{u}
              <button
                onClick={() => handleRemoveAdmin(u)}
                className="text-gray-500 hover:text-red-400 ml-1"
              >
                &times;
              </button>
            </span>
          ))}
          {admins.length === 0 && <span className="text-gray-500 text-sm">なし</span>}
        </div>

        <form onSubmit={handleAddAdmin} className="flex gap-2">
          <input
            type="text"
            value={newAdmin}
            onChange={(e) => setNewAdmin(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            placeholder="GitHub ユーザー名..."
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            追加
          </button>
        </form>
      </div>
    </div>
  );
}
