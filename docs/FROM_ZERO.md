# 從零建立你自己的連接

## 0. 準備帳戶與界線

你需要自己的 Zepp / Amazfit 帳戶、Intervals.icu 帳戶，以及可使用 Sites 與自訂插件的 ChatGPT 環境。功能是否開放由你的方案及工作區設定決定；先確認介面提供相關功能。

本教學以成人使用自己的資料為範圍。不使用他人的 key 或帳戶。先決定願意讓 ChatGPT 看到的欄位與日期；若不想把健康資料帶進聊天，只完成無資料的 `check_connection` 即可。

## 1. 先讓資料進入 Intervals

1. 登入你自己的 [Intervals.icu](https://intervals.icu/)，開啟 [連線設定](https://intervals.icu/settings/connections)。
2. 找 **Amazfit** 的連接項目，依官方整合流程連接自己的帳戶，並確認同意傳輸的資料範圍。
3. 等待同步後，先在 Intervals 畫面核對一筆你認得的活動，以及需要使用的一天日指標。
4. 若活動或欄位沒有進入 Intervals，先處理這一段；MCP 不會從手錶補抓，也不會強制更新來源。

官方整合說明與可同步範圍見 [來源頁](UPSTREAM.md)。不要為了這個教學申請企業 Zepp Open Platform，也不要假定 ZeppBridge 是 Intervals 同步器。

## 2. 取得自己的 Intervals 個人 API key

在 Intervals 的 Settings 往下找到 頁面底部 **Developer Settings** 區，使用 API key 旁的鉛筆／`(view)`控制項，依目前畫面建立或查看你的個人 key。確切步驟和官方來源見 [設定說明](SETTINGS.md)。

這不是 OpenAI API key，也不是 Zepp App ID 或 App Secret。不要把 key 貼給助理；先保留在你自己的安全環境中，等私人 Site 建好後自行填入 Secret。使用 API 前自行閱讀並接受 [Intervals API 條款](https://forum.intervals.icu/t/intervals-icu-api-terms-and-conditions/114087)。

## 3. 取得範本並先測試

要把範本提供給 Sites，可以在 GitHub 下載 ZIP。要自行跑完整檢查，請依 README 用 Git clone，再執行 `npm ci`、`npm run verify`；公開內容掃描需要 Git checkout。若只有 ZIP，先解壓縮，在根目錄執行 `git init`、`git add .`，建立本機檢查用的暫存清單，再跑檢查。這不會上傳任何東西。你不需要任何真實 key 就能跑合成測試和建置。

請勿把你過去的健康匯出檔、舊 `.env` 或部署憑證一起放入這個資料夾。範本的 `.env.example` 只有空值與停用開關。

## 4. 建立全新的私人 Site

在支援 Sites 的 ChatGPT / Codex 工作環境提供這個 repo，明確要求：

> 請以此 repo 建立屬於我的全新私人 Sites MCP。不要沿用別人的 Site 或插件識別值。先保留資料讀取與條款開關為 false，不加入 API key 或真實健康資料。保留 MCP 能力和擁有者檢查，完成合成測試後部署私人版本，回傳我的 Site 與插件安裝入口。若需要安全設定，讓我自己在 Site Settings 輸入。

Sites 建立流程必須回傳新的專案，取代 `.openai/hosting.json` 中的佔位符。**不要把佔位符改成這個教學作者的識別值**。也不要用普通靜態網站或無登入的 Worker 取代 Sites 而保留同樣的驗證程式。

此範本的功能依賴 Sites 平台替請求驗證登入並注入身份 header。換平台必須另外設計並驗證 OAuth / JWT、移除外部偽造的身份 header，以及保護 origin；本 repo 不提供通用跨平台驗證器。

## 5. 設定自己的擁有者

跟著 [SETTINGS.md](SETTINGS.md#建立自己的-owner_email_sha256) 使用本機 hash 工具，對你實際登入該 Site 的 ChatGPT 帳戶 email 做 `trim → lowercase → SHA-256`。只把得到的 hash 填入你自己的 Site 設定。

範本沒有預先固定任何擁有者。填錯 hash 會得到 403；分享網站給其他人不會讓他們成為這個資料連接的擁有者。

## 6. 填 Secret、保留停用、重新部署

在 Sites 找到你自己的網站，開啟 More actions → Settings。依 [完整設定清單](SETTINGS.md) 親自新增 `INTERVALS_API_KEY`，類型必須是 Secret。先維持 `INTERVALS_READ_ENABLED=false`，再檢查 owner hash 和條款狀態。

儲存環境設定後，要重新部署已核准的保存版本才會生效。可以告訴助理：

> 我已在自己的 Site Settings 填好安全設定。請只檢查設定名稱與 secret 是否存在，不讀取值，並重新部署已核准版本。先不要讀取健康資料。

## 7. 接上自己的插件

用 Sites 提供的插件安裝入口，登入自己的 ChatGPT 帳戶並完成連接。只使用剛建立的 Site 所提供的 MCP 連接資訊；不要複製別人的插件 ID 或猜 OAuth URL。

先要求呼叫 `check_connection`。它成功只證明插件能回答固定訊息。接著用 `get_data_health` 確認擁有者與開關；它仍不連線 Intervals，也不能證明資料同步成功。

## 8. 明確開通並驗證一小段真實資料

你準備好讓這個連接讀取自己的資料，並已接受 API 條款後，才把 `INTERVALS_API_TERMS_ACCEPTED` 與 `INTERVALS_READ_ENABLED` 改成 `true`，儲存並重新部署。

例：明確要求讀取一個你選擇的日期、最多一筆 Zepp 活動摘要，再與 Intervals 畫面比對。不要先要求「讀取我的所有健康資料」。每次用當地日期的 `YYYY-MM-DD`，最多 31 天。

日指標要另外完成日期限定的 Zepp-only 聲明。不能因為你允許一般讀取，就推定步數、睡眠、HRV 等全部來自 Zepp。沒有把握就不要開通。

## 9. 停用與復原

停用讀取：將 `INTERVALS_READ_ENABLED=false`，儲存並重新部署。撤銷提供商存取：到 Intervals 撤銷或輪替 key。聊天裡已經顯示的資料不會因此自動刪除。

換電腦、重建 Site、回退程式碼的方式見 [RESTORE.md](RESTORE.md)。不要把 key 當作一般程式碼備份。
