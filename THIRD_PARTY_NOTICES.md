# 第三方來源與授權說明

公開程式碼不等於整份 repo 已自動採用 MIT。本 repo 沒有新增覆蓋全部檔案的根目錄 LICENSE，也不替不明來源或第三方依賴重新授權。

## 專案脈絡

- [ZeppBridge](https://github.com/lingcang728/ZeppBridge)：歷史研究／本機路線參考；[其 MIT LICENSE](https://github.com/lingcang728/ZeppBridge/blob/main/LICENSE) 歸原作者及貢獻者。本 repo 不包含 ZeppBridge 桌面原始碼，也不宣稱是官方雲端版本
- 本 repo 的連接邏輯與教學為另行製作；Sites / Vinext 的應用骨架與建置工具保留原來的檔案，並保留已有的授權通知
- [Intervals.icu](https://intervals.icu/)、[Zepp](https://www.zepp.com/) 及 [ChatGPT Sites](https://learn.chatgpt.com/docs/sites) 為各自服務；商標、服務條款與資料用途限制由各權利人管理

## 已保留的檔案通知

- `build/sites-vite-plugin.ts`：相鄰的 `build/sites-vite-plugin.LICENSE` 保留 OpenAI 2026 MIT 通知
- `vendor/shadcn-tailwind-4.13.0.css`：相鄰的 `vendor/shadcn-tailwind-4.13.0.LICENSE.md` 保留 MIT 通知
- `components/ui/button.tsx`、`hooks/use-mobile.ts`：源自 [shadcn/ui](https://github.com/shadcn-ui/ui)，同樣適用已保留的 `vendor/shadcn-tailwind-4.13.0.LICENSE.md`（Copyright 2023 shadcn / MIT）；該通知在此也涵蓋這兩份元件／hook，不僅是 CSS

## 套件依賴

`package.json` 和 `package-lock.json` 記錄依賴及版本。此 repo 只發布原始碼與 lockfile，不附 `node_modules`、預先安裝的原生二進位檔或建置輸出。

依賴並非全部 MIT：鎖檔包含 MPL、LGPL、CC-BY 等授權的套件或原生元件。安裝、修改、部署或再散布時，請依各套件的實際授權檔及你的使用方式檢查義務；不能把這份說明當成完整法律意見。

若要替自己新增的作品採用某種授權，先確認你有權授權，清楚限定範圍並保留第三方通知。不要因為上游某一個 repo 是 MIT 就對整個依賴樹做同樣宣稱。
