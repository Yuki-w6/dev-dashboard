# Dev Dashboard

GitHub と WakaTime のデータを日次取得・蓄積し、React で可視化して GitHub Pages で公開する個人開発ダッシュボードです。

## 構成

```
dev-dashboard/
├── .github/workflows/
│   ├── fetch.yml         # 日次データ取得（毎朝 6:00 JST）
│   └── deploy.yml        # GitHub Pages へのビルド & デプロイ
├── scripts/
│   └── fetch_metrics.rb  # WakaTime / GitHub API 取得スクリプト
├── data/                 # 日次 JSON（Git で蓄積）
│   ├── YYYY-MM-DD.json
│   └── history.json      # 全日次データの集約
├── public/
│   └── history.json      # ビルド時に data/ からコピーされる
└── src/
    └── App.tsx           # ダッシュボード本体
```

## セットアップ手順

### 1. 開発環境の起動（devcontainer）

Node.js 20 と Ruby 3.3 が設定済みの devcontainer を用意しています。

**VS Code の場合**
1. [Dev Containers 拡張機能](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)をインストール
2. リポジトリを開き、コマンドパレットから `Dev Containers: Reopen in Container` を実行
3. コンテナ起動後、`npm install` が自動で走ります

**GitHub Codespaces の場合**
- リポジトリの「Code」→「Codespaces」→「Create codespace on main」で即起動

ローカルに Node.js / Ruby を直接インストールして使う場合は `npm install` を手動で実行してください。

### 2. API キーの取得

**WakaTime API キー**
1. https://wakatime.com/settings/api-key を開く
2. API キーをコピーする

**GitHub PAT（Personal Access Token）**
1. https://github.com/settings/tokens/new を開く
2. スコープ `read:user` を選択してトークンを生成する

### 3. リポジトリの Secrets 設定

GitHub リポジトリの Settings → Secrets and variables → Actions で以下を登録する:

| Secret 名          | 内容                   |
|--------------------|------------------------|
| `WAKATIME_API_KEY` | WakaTime の API キー   |
| `GH_PAT`           | GitHub PAT             |
| `GH_USER`          | GitHub ユーザー名      |

### 4. vite.config.ts の base を変更

```ts
// vite.config.ts
base: '/あなたのリポジトリ名/',
```

### 5. GitHub Pages のデプロイ元を設定

リポジトリの Settings → Pages → Build and deployment で
「Source」を **GitHub Actions** に変更する。

### 6. ローカルでの試走

```bash
# .env ファイルを作成（絶対にコミットしないこと）
cat > .env <<EOF
WAKATIME_API_KEY=your_wakatime_api_key
GH_PAT=your_github_pat
GH_USER=your_github_username
EOF

# データ取得（Ruby 標準ライブラリのみ使用）
ruby scripts/fetch_metrics.rb

# 開発サーバー起動
npm run dev
```

## 注意事項

> **API キーは GitHub Secrets のみに保存してください。**
> `.env` ファイルや `vite.config.ts` など、いかなるファイルにも API キーをハードコードしてはいけません。
> `.env` は `.gitignore` で除外済みですが、`git add` 時に誤ってステージしないよう注意してください。
