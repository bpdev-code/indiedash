// Xの重複投稿防止に引っかからないよう、月とMRRを毎回埋め込んで文面を一意にする
export function buildShareTweetText(publicUrl: string, totalMRR: number): string {
  const monthLabel = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
  return `${monthLabel}のMRRは¥${totalMRR.toLocaleString()}です。\n${publicUrl}\n#indiedash #個人開発`
}
