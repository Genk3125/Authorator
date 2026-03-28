"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [initialAdmin, setInitialAdmin] = useState("");
  const [error, setError] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasOAuth, setHasOAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redisError, setRedisError] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const step = searchParams.get("step");
  const oauthError = searchParams.get("error");
  const oauthUser = searchParams.get("user");
  const isNewUser = searchParams.get("new") === "1";

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        setNeedsSetup(data.needsSetup);
        setHasOAuth(data.hasOAuth);
        if (data.redisError) setRedisError(true);
        setLoading(false);
      })
      .catch(() => {
        setRedisError(true);
        setNeedsSetup(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (oauthError) {
      switch (oauthError) {
        case "not_admin":
          setError(`@${oauthUser || "unknown"} は管理者として登録されていません`);
          break;
        case "oauth_failed":
          setError("GitHub 認証に失敗しました");
          break;
        case "invalid_state":
          setError("セッションが無効です。もう一度お試しください");
          break;
        default:
          setError("認証エラーが発生しました");
      }
    }
  }, [oauthError, oauthUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // For new users setting password, confirm match
    if (isNewUser && password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        action: needsSetup ? "setup" : "login",
        initialAdmin: needsSetup ? initialAdmin.replace(/^@/, "") : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // --- Initial Setup ---
  if (needsSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Authorator</h1>
            <p className="text-gray-400">初期セットアップ</p>
          </div>

          {redisError && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-300 text-sm font-semibold mb-1">Redis 未接続</p>
              <p className="text-red-400/70 text-xs">
                Vercel の環境変数に UPSTASH_REDIS_REST_URL と UPSTASH_REDIS_REST_TOKEN を設定してから再デプロイしてください。
                設定後にこのページをリロードしてください。
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                あなたの GitHub ユーザー名
              </label>
              <input
                type="text"
                value={initialAdmin}
                onChange={(e) => setInitialAdmin(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="your-github-username"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                この GitHub アカウントが最初の管理者になります
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                あなたのパスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="8文字以上のパスワード"
                minLength={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                あなた専用のログインパスワードです（他のユーザーとは共有されません）
              </p>
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              セットアップ完了
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Step 2: Password (after GitHub OAuth) ---
  if (step === "password") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Authorator</h1>
            <p className="text-green-400 text-sm mb-1">GitHub 認証 OK</p>
            {isNewUser ? (
              <p className="text-gray-400">初回ログインです。あなた専用のパスワードを設定してください</p>
            ) : (
              <p className="text-gray-400">パスワードを入力してください</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder={isNewUser ? "新しいパスワード（8文字以上）" : "パスワード"}
                minLength={8}
                required
                autoFocus
              />
            </div>

            {isNewUser && (
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="パスワード確認"
                  minLength={8}
                  required
                />
              </div>
            )}

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {isNewUser ? "パスワードを設定してログイン" : "ログイン"}
            </button>

            {isNewUser && (
              <p className="text-xs text-gray-500 text-center">
                このパスワードはあなた専用です。他のユーザーとは共有されません。
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // --- Step 1: GitHub OAuth ---
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Authorator</h1>
          <p className="text-gray-400">GitHub Branch Protection Bot</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {hasOAuth ? (
            <a
              href="/api/auth/github"
              className="flex items-center justify-center gap-3 w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub でログイン
            </a>
          ) : (
            <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
              <p className="text-yellow-300 text-sm font-semibold mb-1">
                GitHub OAuth 未設定
              </p>
              <p className="text-yellow-400/70 text-xs">
                GITHUB_CLIENT_ID と GITHUB_CLIENT_SECRET を環境変数に設定してください。
                GitHub App の設定画面から取得できます。
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-gray-600">
              GitHub 認証 + 個人パスワードの二重認証
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
