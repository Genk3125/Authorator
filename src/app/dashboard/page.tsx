"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RepoConfig } from "@/lib/db/schema";

interface HealthStatus {
  status: string;
  checks: Record<string, string>;
}

export default function DashboardPage() {
  const [repos, setRepos] = useState<RepoConfig[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [newOwner, setNewOwner] = useState("");
  const [newRepo, setNewRepo] = useState("");
  const [newAdmin, setNewAdmin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Password change
  const [showPwChange, setShowPwChange] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  const router = useRouter();

  async function fetchData() {
    const [reposRes, adminsRes, healthRes] = await Promise.all([
      fetch("/api/settings/repos"),
      fetch("/api/auth/admins"),
      fetch("/api/health"),
    ]);
    const reposData = await reposRes.json();
    const adminsData = await adminsRes.json();
    const healthData = await healthRes.json();
    setRepos(reposData.repos || []);
    setAdmins(adminsData.admins || []);
    setHealth(healthData);
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwErr("");
    setPwMsg("");
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPwErr(data.error);
      return;
    }
    setPwMsg("パスワードを変更しました");
    setCurrentPw("");
    setNewPw("");
    setTimeout(() => {
      setPwMsg("");
      setShowPwChange(false);
    }, 2000);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Authorator</h1>
          <p className="text-gray-400 text-sm">ダッシュボード</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowPwChange(!showPwChange)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            PW変更
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* Health status */}
      {health && (
        <div className={`mb-6 p-4 rounded-lg border ${
          health.status === "healthy"
            ? "bg-green-900/20 border-green-800"
            : "bg-yellow-900/20 border-yellow-800"
        }`}>
          <div className="flex items-center gap-3 text-sm">
            <span className={`w-2 h-2 rounded-full ${
              health.status === "healthy" ? "bg-green-400" : "bg-yellow-400"
            }`} />
            <span className={health.status === "healthy" ? "text-green-300" : "text-yellow-300"}>
              {health.status === "healthy" ? "全システム正常" : "一部サービスに問題あり"}
            </span>
            <div className="flex gap-3 ml-auto text-xs">
              {Object.entries(health.checks).map(([key, val]) => (
                <span key={key} className={val === "ok" || val === "configured" ? "text-green-400" : "text-red-400"}>
                  {key}: {val}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Password change */}
      {showPwChange && (
        <form onSubmit={handlePasswordChange} className="mb-6 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">パスワード変更</h2>
          <div className="flex gap-3">
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="現在のパスワード"
              required
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="新しいパスワード (8文字以上)"
              minLength={8}
              required
            />
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              変更
            </button>
          </div>
          {pwErr && <div className="text-red-400 text-sm mt-2">{pwErr}</div>}
          {pwMsg && <div className="text-green-400 text-sm mt-2">{pwMsg}</div>}
        </form>
      )}

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
            <div className="text-center py-8 text-gray-500 bg-gray-900 rounded-lg border border-gray-800">
              リポジトリが登録されていません
            </div>
          ) : (
            repos.map((config) => (
              <div
                key={`${config.owner}/${config.repo}`}
                className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <Link href={`/dashboard/${config.owner}/${config.repo}`} className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      config.enabled && health?.checks.github_app === "configured"
                        ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                        : "bg-gray-600"
                    }`} />
                    <span className="text-white font-medium">{config.owner}/{config.repo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.enabled ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>
                      {config.enabled ? "稼働中" : "停止"}
                    </span>
                    <span className="text-xs text-gray-500">
                      保護: {config.protectedBranches.join(", ") || "なし"}
                    </span>
                    <span className="text-xs text-gray-500">
                      権限者: {config.authorizedUsers.length}人
                    </span>
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
          GitHub OAuth でログイン可能な GitHub アカウント（各ユーザーは初回ログイン時に個別パスワードを設定）
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
