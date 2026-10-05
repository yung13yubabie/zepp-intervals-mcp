# 來源與製作脈絡

查核日期：2026-10-05。這裡說明為什麼選這條路，以及前面的專案與這個 repo 有什麼關係。

## 為什麼經過 Intervals？

目標是讓個人讀取自己的 Zepp 資料。Zepp 的公開 REST API 申請文件仍列出企業合作限制；研究申請也要求以學校名義提出。這份較早期的文件不代表規則永遠不變，但不能假定個人註冊開發者帳戶就會取得健康雲端 API 資格。[Zepp 官方 App Registration](https://github.com/zepp-health/rest-api/wiki#2-app-registration)

Zepp OS 文件主要面向手錶 app／錶面開發，不能當作取得歷史健康資料 Web API 的通行證。[Zepp OS 文件](https://docs.zepp.com/)

Intervals 已與 Zepp 團隊合作提供 Amazfit 整合。因此本教學先使用你自己授權的 Zepp→Intervals 連接，再讀自己的 Intervals 帳戶，不借用別人的企業 API client。[官方整合公告](https://forum.intervals.icu/t/amazfit-zepp-support-available/107652)

### 實際點哪裡

1. 先在手機 Zepp app 同步手錶
2. 到 [Intervals 連線設定](https://intervals.icu/settings/connections)，找 **Amazfit** 卡片
3. 選擇需要的活動／wellness 下載項目，完成官方授權；登入方式要與自己的 Zepp 帳戶一致
4. 回 Intervals 核對一筆活動和一天日指標，再開始設定 MCP

最早公告中 HRV 曾尚未開放；維護者後續已說明可在 Amazfit wellness 選項啟用睡眠期間平均 HRV。不同欄位仍需以你帳戶實際收到的資料為準。[後續更新](https://forum.intervals.icu/t/amazfit-zepp-support-available/107652?page=3)

這個 MCP 不會觸發 Zepp 即時同步。活動與 wellness 更新機制不同，不能承諾你每問一次 ChatGPT 就拿到剛剛手錶上的數字。

## ZeppBridge 在哪裡？

[lingcang728/ZeppBridge](https://github.com/lingcang728/ZeppBridge) 是非官方、本機優先的桌面工具，提供本機 CLI / MCP。它是前期研究來源與另一種本機使用方式，不是這個 repo 的必要安裝步驟，也不是已驗證的 Intervals 同步中繼。

本次查核的 main 指向 [192924ab](https://github.com/lingcang728/ZeppBridge/commit/192924ab46e3cae9f3539ae281d75c970ddb054f)，[package.json](https://github.com/lingcang728/ZeppBridge/blob/192924ab46e3cae9f3539ae281d75c970ddb054f/package.json) 版本為 2.4.4。讀取未來 main 時請重新確認，不能拿本文件日期當成永久保證。

### 不要把這幾個版本混在一起

| 名稱 | 代表什麼 | 現在需要安裝嗎？ |
| --- | --- | --- |
| 上游 ZeppBridge | 原始桌面程式，本機路線 | 不需要 |
| 前期 Cloud MCP v3 | 本專案前期另行製作的 Python 雲端實驗包；v3 不是上游 3.x 版本 | 不需要 |
| 前期 Intervals v4 | 前期 Python 延伸，加入 Intervals adapter；與這版的執行環境、快取方式不同 | 不需要 |
| 本 repo | 另行實作的 TypeScript / Sites 私人唯讀連接；不帶健康資料快取 | 依本教學使用 |

你不必先部署 v3、升級 v4，再轉這版。前期思考留下的是「欄位最小化、來源不能亂認、金鑰不進聊天」等設計；不是把整個桌面程式或 Python 包直接變成網站。

## API key 與資料欄位的依據

- [Intervals 官方 API 指南](https://forum.intervals.icu/t/api-access-to-intervals-icu/609)：個人 key 位於 Settings 底部 Developer Settings；Basic auth 的使用者名稱固定 `API_KEY`，`athlete/0` 表示 key 所屬帳戶
- [個人 GPT 的公開操作回覆](https://forum.intervals.icu/t/api-for-private-custom-gpt/107281)：Developer Settings 的 API Key `(view)` 旁有鉛筆／編輯入口。這是公開操作例，不代表已檢查你目前的登入介面
- [官方 API cookbook](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090)：個人 key 與多使用者 OAuth 的不同用法
- [官方 OpenAPI](https://intervals.icu/api/v1/docs)：本次核對 Activity.source 含 `ZEPP`；Wellness 沒有對等的 source 欄位
- [Sites 官方設定](https://learn.chatgpt.com/docs/sites#configure-runtime-environment-values)：More actions → Settings 管理環境值／Secret，變更後重新部署已核准版本

API spec 會更新。這次只確認實作所需欄位及來源限制，沒有聲稱它與前期保存的規格檔完全相同。

## 條款不是技術上「能抓到」就算通過

使用前自行讀取 [Intervals API 條款](https://forum.intervals.icu/t/intervals-icu-api-terms-and-conditions/114087)。它不會替其他來源授權，也不會因個人同意就自動排除第三方限制。

本 repo 不將 Strava 當中繼，也不把其來源資料送進 LLM。查核時的 [Strava API Policy](https://www.strava.com/legal/api_policy) 對 AI 使用與自行轉曝 MCP 有限制，另有官方 Strava MCP 例外。這不是「所有 Strava 的 AI 功能都違規」的宣稱；若改用別的服務，應重新核對其正式授權。

ZeppBridge 上游的 [MIT LICENSE](https://github.com/lingcang728/ZeppBridge/blob/main/LICENSE) 只適用於它涵蓋的作品，不會自動替這個 repo 全部檔案授權。見 [第三方說明](../THIRD_PARTY_NOTICES.md)。
