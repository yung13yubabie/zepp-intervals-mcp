# 卡住時，先看這裡

## 插件顯示連線成功，卻還沒有資料

`check_connection` 只回固定訊息。接著呼叫 `get_data_health` 看設定，不要直接判斷金鑰或同步已成功。

- `read_disabled`：讀取尚未開通，或儲存後還沒重新部署
- `terms_pending` / `api_terms_acceptance_required`：尚未設定自己接受 API 條款
- `credential_not_configured`：Secret 未填、名稱錯誤或值格式不正確
- `configured_not_connection_verified`：設定看起來齊備；仍要明確允許一小筆真實讀取才知道上游是否成功

不要把 key 貼到聊天請人「幫忙驗證」。回去自己的 Site Settings 檢查即可。

## 已按 Save，狀態沒有變

Save 只儲存環境設定。請重新部署已核准的保存版本，確認部署成功，再測一次。變更 key、讀取開關、owner hash 或日指標聲明都要這樣做。[官方說明](https://learn.chatgpt.com/docs/sites#configure-runtime-environment-values)

## 出現 401 或 403

- 未登入或身份 header 不完整：使用自己 Site 提供的正常登入／插件連接流程
- `Site owner authorization required`：確認 owner hash 使用的是登入該 Site 的 ChatGPT email，且已重新部署
- `provider_credential_rejected`：Intervals 拒絕 key；由你在官方帳戶重新確認／輪替，再更新 Secret
- 跨來源請求被拒絕：不要從陌生網頁直接呼叫 endpoint，也不要為了除錯關掉 origin 檢查

分享 Site 給另一個帳戶不會讓他通過 owner hash。這是刻意的限制。

## 活動列表是空的

先到 Intervals 檢查同一個**當地日期**是否確實有活動。這個 MCP 只接受 API 明確標記 `ZEPP` 的活動；其他來源、來源空白或未知都不會回傳。不要把篩選改成「只要不是 Strava 就可以」。

若資料根本沒進 Intervals，MCP 無法補同步。請先檢查 Zepp→Intervals 那一段；`fetched_at` 只代表現在有讀 API。

## 步數、睡眠或 HRV 全是 null

先看 `missing_reason`：

- `source_unverified`：沒有有效的 Zepp-only 聲明，或日期超出聲明範圍。沒有把握就保留封鎖
- `no_provider_record`：範圍內沒有該天紀錄
- `missing_or_invalid`：欄位沒有有效數值，不改填 0
- `carried_forward_not_measured`：靜息心率是延用值，不當作當日實測

Intervals 日指標可能混合來源，也可能有人手動修改；畫面有值不代表來源已被證實。此範本不會替你判定。

## 為何沒有睡眠分期、全天心率、路線或完整 workout detail？

這些不在此版允許的欄位內。`get_workout_detail` 是單筆**摘要**，`get_sleep_detail` 也是**摘要**。擴充前需重新確認來源、API 能力、授權與隱私，不應根據欄位名稱猜出不存在的資料。

## 日期錯誤、資料過多或速度限制

- `invalid_date`：用真實日曆日期 `YYYY-MM-DD`
- `date_window_must_be_1_to_31_days`：縮小到 1–31 天，包含首尾兩天
- `provider_rate_limited`：遵守回應的 `retry_after_seconds`；不要自動連續重試
- `request_budget_exceeded_no_partial_result` / `saturated_window_no_partial_result`：資料量太大，縮小日期範圍後再明確要求
- `conflicting_activity_id` / `conflicting_wellness_date` / `provider_out_of_window`：上游內容矛盾或超出範圍；不拿部分資料當完整結果

## 本機檢查失敗

先確認 Node.js 至少 22.13、在 repo 根目錄執行、使用 repo 附的 lockfile。

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run scan:public
npm run build
```

若 npm cache 無法寫入，可以自己選擇可寫入資料夾，例如 `npm ci --cache .npm-cache`，並把該資料夾保持在 Git 之外。不要為了解決安裝錯誤刪 lockfile 或加入真實 key。

`scan:public` 只掃描 Git 已追蹤／暫存的檔案，必須在 Git checkout 使用。它是公開範本的基本防呆，不是完整秘密偵測器；仍需人工檢查所有準備公開的內容。個人私人部署把 Site ID 換成真值後，這個**公開範本**掃描應失敗；不要把自己的部署設定推回公開教學。

## 回報時提供什麼

描述正在做的步驟、錯誤代碼、Node.js 版本及使用的 repo commit。盡量用合成例子重現。不要附 key、owner hash、email、完整健康工具回應或私人服務識別資料。
