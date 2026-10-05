# 安全與資料範圍

## 公開的是程式與教學

此 repo 不包含真實健康紀錄、個人 API key、擁有者指紋、現有 Site / plugin 識別值或部署憑證。測試中的日期、email、活動、數值及 key 都是刻意建立的合成資料。

自己的 Site 請保持私人。GitHub repo 是否公開和 Site 是否私人是兩個不同設定。

## 讀取前的防線

1. 正式請求必須經過 Sites 的可信任登入閘道
2. 資料工具再核對登入者 email 的 SHA-256 是否等於你設定的擁有者
3. 讀取開關與 API 條款開關都必須明確等於 `true`
4. 必須具備你自己輸入的 Intervals key
5. 只使用固定的 Intervals HTTPS 網址與 key 擁有者帳戶，不接受外來 URL 或 athlete ID
6. 日指標另需完整、日期限定的來源聲明

`check_connection` 只要求已登入使用者，回傳固定狀態。初始化與工具清單不回傳身份、設定值或健康資料。`get_data_health` 要求擁有者，只檢查設定，不讀提供商。

## 不可直接換成無保護的公開主機

`oai-authenticated-user-*` header 只在 Sites 閘道已驗證並控制的邊界內可信。owner hash 是額外的 allowlist，不是獨立身份驗證。若直接把 Worker / 開發伺服器公開，攻擊者可以自己送同名 header。

本機預覽只用合成資料，不填真實金鑰。若要移植平台，先建立完整的 OAuth / JWT 驗證、外部 header 清除、可信 ingress 與 origin 保護；不能只改部署指令。

## 會與不會傳送什麼

資料取得路線是 Intervals → 你的私人 Site → 你正在使用的 ChatGPT 對話。請在第一次真實讀取前，明確決定日期、欄位與用途。此程式不代表你的同意，也不替第三方條款提供例外。

- 活動：ID、類型、UTC／當地開始時間、距離、移動／經過秒數、平均／最大心率；只回傳 `source=ZEPP`
- 日指標：步數、靜息心率、RMSSD HRV、睡眠秒數／分數／品質；沒有來源聲明就不請求上游，也不給數值
- 不請求／轉傳 GPS、路線、活動名稱、備註、Strava ID、stream、原始檔案、完整個人資料或其他指標
- 不建立健康資料庫、應用快取、排程同步或應用資料紀錄；提供商、平台及聊天服務仍有各自的資料政策

API key 會在 HTTPS Authorization header 傳給 Intervals。程式只做 GET，卻無法把一把可寫入的 key 變成提供商層級的唯讀 key。不要認為 `readOnlyHint` 可以保護遭外洩的 key。

## 缺值、來源及範圍

- `null` 是缺值／未驗證／不適用，不補成 0
- 日指標來源聲明不等於 API 來源證據，永遠保留 `source_verified=false`
- 睡眠分數量尺未知；sleepQuality 是 1 最好、4 最差；沒有睡眠階段或起訖
- HRV 使用 `hrv`，按 Zepp 來源聲明解讀為夜間 RMSSD；不虛構 `avgHRV` 或 SDNN
- `tempRestingHR=true` 的延用心率不當成實測；標記缺失則保留未知
- `fetched_at` 是讀取時間；`last_zepp_sync_at` 保持空值
- 每次 1–31 天、回傳最多 100 筆活動摘要；上游最多 8 次循序請求、20 秒操作期限、每份回應 2 MiB
- 上游飽和分段、重複矛盾或超額時失敗，不用不完整資料假裝成功；429 不自動重試

## 撤銷

停止新讀取：`INTERVALS_READ_ENABLED=false`，儲存並重新部署。撤銷上游權限：在 Intervals 撤銷／輪替 key。執行中的請求可能在新部署切換前完成。這些操作不會自動刪除先前的聊天內容。

若 key 外洩，先在提供商撤銷，再修正來源與新 Secret；刪掉 GitHub 最新檔案不會清除提交歷史、fork 或他人的副本。

## 回報問題

不要公開提交含 key、健康資料、email、owner hash、私人 Site URL 或原始日誌的 issue。先刪減成合成例子，只保留必要錯誤代碼。一般功能問題可以用不含私人資訊的 GitHub issue；涉及憑證則先處理撤銷，不等待維護者回覆。
