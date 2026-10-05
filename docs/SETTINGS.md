# 設定：在哪裡填、填什麼、如何知道有效

## 先分清楚三種東西

- **Intervals 個人 API key**：讓程式存取你的 Intervals 帳戶。只能由你親自輸入安全設定
- **Site 的 Secret**：儲存 API key 的欄位類型，不是另一把 key
- **OWNER_EMAIL_SHA256**：限制誰能呼叫資料工具的 email 指紋。不是密碼，也不能取代登入

## 找 Intervals 的 API key

1. 自己登入 Intervals.icu
2. 開啟 **Settings**，找到 頁面底部 **Developer Settings** 區
3. 點 **API key** 旁的鉛筆／`(view)`按鈕，依帳戶目前畫面操作
4. 不要把 key 貼到聊天或 issue，不要截圖包含 key 的畫面

官方 頁面底部 **Developer Settings** 區與鉛筆按鈕的來源連結見 [UPSTREAM.md](UPSTREAM.md)。如果畫面不同，先用官方說明核對；不要猜另一個欄位是 key。

帳戶固定取 key 的擁有者（API 路徑使用 `athlete/0`）。本範本不需要你填 athlete ID，也沒有任意帳戶選擇器。個人 key 可能可寫入；本程式的唯讀設計**不會降低 key 本身的權限**。

## 在自己的 Site 填設定

開啟 ChatGPT 的 Sites，找到你自己建立的網站，選 **More actions → Settings**，新增下列項目。

| 名稱 | 類型／值 | 什麼時候填 |
| --- | --- | --- |
| `INTERVALS_API_KEY` | **Secret**；填自己的 Intervals 個人 key | Site 建好後由你親自填 |
| `OWNER_EMAIL_SHA256` | 建議 Secret；填下面工具算出的指紋 | 初次設定自己的擁有者 |
| `INTERVALS_READ_ENABLED` | 一般環境變數，初始填 `false` | 準備開通才改成 `true` |
| `INTERVALS_API_TERMS_ACCEPTED` | 一般環境變數，初始填 `false` | 自己讀完並接受條款後才改成 `true` |

欄位名稱大小寫需完全相同。值為純文字 `true` / `false`，不要連引號一起貼上。若介面分開「Environment variable」與「Secret」，API key 一定選 Secret。若沒有 Secret 選項，先停下核對 [Sites 官方說明](https://learn.chatgpt.com/docs/sites#configure-runtime-environment-values)，不要改填公開欄位。

**Save 不等於已生效。** 儲存後請重新部署已核准的保存版本；這是套用新環境設定，不需要因為更換 key 而改寫程式。不要把環境值放入 `.openai/hosting.json`。

## 建立自己的 OWNER_EMAIL_SHA256

請使用**登入你新 Site 的 ChatGPT 帳戶 email**，不是 Intervals 的帳戶 email。兩者可以不同。

在你自己的電腦、repo 資料夾執行：

```sh
npm run owner:hash
```

終端機會要求 email，輸入時不回顯，按 Enter 後只輸出指紋。腳本只在本機計算，不連網、不寫檔、不讀環境 secret。你可以先看 [腳本](../scripts/owner-hash.mjs) 再執行。

計算規則是去除頭尾空白、轉為小寫，再做 SHA-256。將結果親自填入自己 Site 的 `OWNER_EMAIL_SHA256`。不要複製測試用帳戶的 hash；它不會讓你通過驗證。指紋仍可被猜測比對，不應視為匿名資料或密碼，也不必提交 GitHub。

如果你使用 Apple 隱藏 email 或不同登入帳戶，請先在自己的帳戶頁確認正確 email。不要為了「讓它能用」而移除擁有者檢查。

## 開通日指標：可選，沒把握就不填

活動有 `source=ZEPP` 標記；日指標沒有等效的來源欄位。只有你確定**整段日期內，準備查詢的步數、睡眠、靜息心率與 HRV 都只由 Zepp 提供，而且沒有手動修改**，才設定以下四項：

| 名稱 | 填入內容 |
| --- | --- |
| `WELLNESS_ZEPP_ONLY_CONFIRMED` | `true` |
| `WELLNESS_ZEPP_ONLY_FROM` | 你確認的第一天，`YYYY-MM-DD` |
| `WELLNESS_ZEPP_ONLY_THROUGH` | 你確認的最後一天，`YYYY-MM-DD` |
| `WELLNESS_ATTESTED_AT` | 你現在做出聲明的 ISO 8601 時間，包含時區 |

格式示意：日期 `2026-01-02`，時間 `2026-01-03T09:00:00+08:00`。**這些只是格式，不是可以直接套用的聲明**。請填自己的真實範圍與聲明時間，最後一天不得晚於聲明當日；不可預先聲明未來所有日期。

四項需一起有效，Save 後重新部署。範圍外回傳 `null / source_unverified`；即使範圍內有值，也保留 `source_verified=false` 與 `ZEPP_OWNER_ATTESTED`，不會假稱 API 已驗證來源。

若有其他平台同步、手動改值或來源不明，清空／撤銷這份聲明並重新部署。不要只因 Intervals 顯示數字就判斷全部來自 Zepp。

## 設完後按這個順序驗證

1. `check_connection`：應得到固定的連線成功訊息
2. `get_data_health`：應看到你預期的開關狀態；這一步不讀 Intervals
3. 明確允許一個日期的一筆活動摘要，再與 Intervals 畫面核對
4. 需要日指標才完成來源聲明，明確允許一天的指定欄位並核對

不要用真實資料測試 public repo 的 CI，也不要在錯誤回報貼完整工具回應。可回報錯誤代碼及已遮蔽的操作步驟。
