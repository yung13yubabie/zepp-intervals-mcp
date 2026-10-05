"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Link2, LockKeyhole, ShieldCheck } from "lucide-react";

type State = "idle" | "loading" | "success" | "error";
export default function Home() {
  const [configMessage, setConfigMessage] = useState("尚未檢查設定；檢查不會讀取健康資料。");
  const [configBusy, setConfigBusy] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("先確認網站服務，再從 ChatGPT 測試插件呼叫。");
  async function check() {
    setState("loading");
    setMessage("正在確認這個網站的服務…");
    try {
      const response = await fetch("/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "check_connection", arguments: {} } }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "請使用有權限的 ChatGPT 帳戶開啟此私人網站，再試一次。" : "目前無法完成檢查，請稍後再試。");
      const result = await response.json() as { error?: unknown; result?: { isError?: boolean; structuredContent?: { status?: string } } };
      if (result.error || result.result?.isError || result.result?.structuredContent?.status !== "ok") throw new Error("服務沒有傳回預期結果，請稍後再試。");
      setState("success");
      setMessage("網站服務回應正常。ChatGPT 插件仍須另外連接並呼叫，才能確認 ChatGPT 對話中的連線。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "連線逾時，請稍後重試。");
    }
  }
  async function checkConfig() {
    setConfigBusy(true);
    try {
      const response=await fetch("/mcp",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"get_data_health",arguments:{}}}),signal:AbortSignal.timeout(12000)});
      if(!response.ok) throw new Error("只有網站擁有者能查看資料設定。請確認登入的 ChatGPT 帳戶。");
      const body=await response.json() as {result?:{isError?:boolean;structuredContent?:{status?:string;wellness_source_policy?:string}}};
      const result=body.result?.structuredContent;
      if(body.result?.isError||!result)throw new Error("暫時無法檢查設定，請稍後重試。");
      const labels:Record<string,string>={read_disabled:"資料讀取目前停用",terms_pending:"尚待確認 Intervals API 條款",credential_not_configured:"尚未設定 Intervals 金鑰",configured_not_connection_verified:"必要設定已齊備，仍待實際唯讀呼叫驗證"};
      setConfigMessage((labels[result.status||""]||"設定狀態未知")+"。"+(result.wellness_source_policy==="date_scoped_owner_attestation"?"日指標有日期範圍來源聲明，仍非 API 來源驗證。":"日指標尚無來源聲明，數值維持封鎖。"));
    } catch(error){setConfigMessage(error instanceof Error?error.message:"暫時無法檢查設定。");}
    finally{setConfigBusy(false);}
  }
  return (
    <main className="shell">
      <header className="topline"><span className="wordmark"><Link2 size={23} aria-hidden="true" /> Z × I</span><span className="private"><LockKeyhole size={15} aria-hidden="true" /> 私人唯讀版</span></header>
      <section className="intro"><p className="eyebrow">連線檢查</p><h1>Zepp × Intervals</h1><p className="lede">你的 Zepp 資料，透過 Intervals 唯讀查詢。</p></section>
      <section className="status-card" aria-labelledby="status-title">
        <div className={`status-icon ${state === "success" ? "success" : ""}`} aria-hidden="true">{state === "success" ? <CheckCircle2 size={30} /> : <Link2 size={30} />}</div>
        <div className="status-body"><p className="label">網站服務</p><h2 id="status-title">{state === "success" ? "連線正常" : state === "loading" ? "檢查中" : state === "error" ? "尚未通過檢查" : "準備好檢查了"}</h2><p role="status" aria-live="polite">{message}</p></div>
        <Button onClick={check} disabled={state === "loading"} className="check-button">{state === "loading" ? "檢查中…" : state === "success" ? "再次檢查" : "檢查網站服務"}</Button>
      </section>
      <section className="setup-state"><div><h2>資料連接設定</h2><p role="status" aria-live="polite">{configMessage}</p></div><Button variant="outline" className="check-button" onClick={checkConfig} disabled={configBusy}>{configBusy?"檢查中…":"檢查資料設定"}</Button></section>
      <section className="boundaries" aria-label="這個測試版的範圍">
        <div><span className="number">01</span><h3>只讀已核准欄位</h3><p>活動摘要、步數、睡眠摘要、靜息心率與 RMSSD HRV。每次最多 31 天，不取 GPS。</p></div>
        <div><span className="number">02</span><h3>保留來源界線</h3><p>活動必須標記 ZEPP。日指標需你確認來源與日期，仍不宣稱 API 已驗證 Zepp 來源。</p></div>
        <div><span className="number">03</span><h3>按要求即時查詢</h3><p>不建立健康資料庫或快取，不自動刷新 wellness。讀取時間不等於 Zepp 最新同步時間。</p></div>
      </section>
      <section className="next-step" aria-labelledby="next-title"><ShieldCheck size={23} aria-hidden="true" /><div><h2 id="next-title">金鑰只填在 Sites 的安全設定</h2><p>請勿貼到聊天、這個網頁、附件或程式碼。個人金鑰可能具有寫入權限；此插件只實作 GET，但不能降低金鑰本身的權限。</p></div></section>
      <section className="setup-guide" aria-labelledby="setup-title"><h2 id="setup-title">由你完成安全設定</h2>
        <ol><li>在 ChatGPT 的 Sites 找到你自己建立的網站，選擇 More actions → Settings。</li>
        <li>自行新增 secret <code>INTERVALS_API_KEY</code>，值為你的 Intervals 個人 API 金鑰。帳戶固定使用該金鑰的擁有者，不接受其他運動員 ID。</li>
        <li>閱讀並同意 <a href="https://forum.intervals.icu/t/intervals-icu-api-terms-and-conditions/114087" target="_blank" rel="noopener noreferrer">Intervals API 條款</a>後，才將 <code>INTERVALS_API_TERMS_ACCEPTED</code> 設為 <code>true</code>。準備啟用時，將 <code>INTERVALS_READ_ENABLED</code> 設為 <code>true</code>。</li>
        <li>儲存後請告訴助理「安全設定已完成，請重新部署已核准版本」。不要附金鑰或包含金鑰的截圖。重新部署前，新設定尚未生效。</li></ol>
        <p className="guide-note">請依本 repo 教學建立自己的擁有者驗證，再設定 <code>OWNER_EMAIL_SHA256</code>；這個範本沒有預設擁有者；變更網站分享對象不會授權其他人讀取你的資料。<a href="https://learn.chatgpt.com/docs/sites#configure-runtime-environment-values" target="_blank" rel="noopener noreferrer">Sites 官方設定說明</a></p>
      </section>
      <section className="setup-guide" aria-labelledby="wellness-title"><h2 id="wellness-title">可選：開通日指標的來源聲明</h2><p>Intervals 日指標 API 沒有來源欄位。只有你確定指定期間內步數、睡眠、靜息心率及 HRV 都只由 Zepp 寫入，而且沒有手動修改時，才設定以下四項；不確定就留空，仍可讀取已標記 ZEPP 的活動。</p>
        <ul><li><code>WELLNESS_ZEPP_ONLY_CONFIRMED</code>：<code>true</code></li><li><code>WELLNESS_ZEPP_ONLY_FROM</code>：你確認的起始日期，YYYY-MM-DD</li><li><code>WELLNESS_ZEPP_ONLY_THROUGH</code>：你確認的結束日期，YYYY-MM-DD，不可晚於聲明當日</li><li><code>WELLNESS_ATTESTED_AT</code>：做出這份聲明的時間，ISO 8601，含時區</li></ul>
        <p>四項需一起有效，且儲存後重新部署。回應會保留「使用者確認 Zepp 來源、API 未驗證」標示。期間外數值為空，不會補成 0。若有其他來源或手動修改，請取消聲明並重新部署。</p>
      </section>
      <section className="setup-guide"><h2>開始查詢與停用</h2><p>設定生效後，先在 Chat 要求「查詢指定日期的一筆 Zepp 活動」，再與 Intervals 畫面核對。需要日指標時再完成來源聲明。睡眠分期、睡眠起訖與全天心率不在此版範圍。</p><p>要停止讀取，將 <code>INTERVALS_READ_ENABLED</code> 改為 <code>false</code> 並重新部署。要撤銷提供商存取，請在 Intervals 撤銷金鑰。已傳回 Chat 的內容不會因此自動刪除。</p></section>
      <footer>私人存取由 Sites 管理 · 沒有排程同步，也不會修改 Intervals 資料</footer>
    </main>
  );
}
