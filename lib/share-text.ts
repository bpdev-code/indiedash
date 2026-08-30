// Xの重複投稿防止に引っかからないよう、月とMRRを毎回埋め込んで文面を一意にする。
// URLにはキャッシュ回避用のパラメータを付け、Xに毎回最新のOGP画像を取得し直させる
export function buildShareTweetText(publicUrl: string, totalMRR: number): string {
  const monthLabel = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
  const freshUrl = `${publicUrl}?t=${Date.now()}`
  return `${monthLabel}のMRR: ¥${totalMRR.toLocaleString()} 📈\n${freshUrl}\n#indiedash #個人開発`
}
