import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "code パラメータが必要です" },
      { status: 400 }
    );
  }

  try {
    // Exchange the code for app credentials
    const res = await fetch(
      `https://api.github.com/app-manifests/${code}/conversions`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json(
        { error: errorData.message || "GitHub API エラー" },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      id: data.id,
      slug: data.slug,
      pem: data.pem,
      webhook_secret: data.webhook_secret,
      html_url: data.html_url,
      client_id: data.client_id,
      client_secret: data.client_secret,
    });
  } catch {
    return NextResponse.json(
      { error: "GitHub との通信に失敗しました" },
      { status: 500 }
    );
  }
}
