// next/og の ImageResponse 用に日本語フォント（Noto Sans JP 700）を取得する。
// Google Fonts の CSS から woff2 の URL を抜き出してフェッチする。失敗しても null を返すだけ。
export async function loadOgFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    ).then(r => r.text())
    const match = css.match(/src: url\(([^)]+)\)/)
    if (!match) return null
    return fetch(match[1]).then(r => r.arrayBuffer())
  } catch {
    return null
  }
}
