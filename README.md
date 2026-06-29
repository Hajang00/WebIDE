
# WebIDE

React + Vite 기반의 Web IDE 데모 프로젝트입니다.

파일 탐색기, 코드 편집 UI, 실시간 채팅(WebSocket), MongoDB 기반 채팅 이력 저장/로드를 제공합니다.

## 주요 기능

- IDE 3분할 화면(탐색기 / 에디터 / 채팅)
- 실시간 채팅 (WebSocket)
- 다중 사용자 동시 접속
- 채팅 이력 MongoDB 저장 및 재접속 시 history 로드
- 채팅 내용 검색(키워드 필터 + 하이라이트)
- 세션 ID 기반 내 메시지 구분

## 기술 스택

- Frontend: React 19, Vite 8
- Realtime: ws (WebSocket)
- Database: MongoDB (mongodb Node.js driver)
- Runtime: Node.js (ESM)

## 프로젝트 구조

```
WebIDE-main/
  README.md
  frontend/
    server/
      websocket-server.js
    src/
      App.jsx
      App.module.css
```

## 실행 방법

### 1) 의존성 설치

```bash
cd frontend
npm install
```

### 2) (선택) MongoDB 환경변수 설정

MongoDB를 사용하지 않으면 서버는 메모리 모드로 채팅만 동작하고, 이력 저장은 비활성화됩니다.

PowerShell 예시:

```powershell
$env:MONGODB_URI="mongodb+srv://<user>:<password>@<cluster-host>/webide?retryWrites=true&w=majority"
$env:MONGODB_DB="webide"
```

추가 옵션:

- `WS_PORT` (기본값: `8080`)
- `CHAT_HISTORY_LIMIT` (기본값: `100`)

### 3) 개발 서버 실행

프론트 + 채팅 서버 동시 실행:

```bash
npm run dev:all
```

개별 실행:

```bash
# 터미널 A
npm run chat-server

# 터미널 B
npm run dev
```

기본 접속 URL:

- Vite: `http://localhost:5173` (충돌 시 5174 등으로 변경)
- WebSocket: `ws://localhost:8080`

## 빌드

```bash
cd frontend
npm run build
```

## WebSocket 이벤트 명세 (핵심)

### Client -> Server

- `set_name`: 표시 이름 변경
  - payload: `{ type: 'set_name', user: string }`
- `chat`: 메시지 전송
  - payload: `{ type: 'chat', text: string }`

### Server -> Client

- `session`: 접속 세션 ID 전달
  - payload: `{ type: 'session', clientId: string }`
- `history`: 최근 메시지 목록 전달
  - payload: `{ type: 'history', messages: Message[] }`
- `chat`: 실시간 채팅 메시지
  - payload: `{ type: 'chat', id, user, text, at, senderId }`
- `system`: 시스템 알림(입장/퇴장/이름변경)
- `online`: 현재 접속자 수
  - payload: `{ type: 'online', count: number }`

## MongoDB 저장 컬렉션

- DB: `webide` (기본값)
- Collection: `chat_messages`
- Document fields:
  - `user`
  - `text`
  - `at`
  - `senderId`
  - `createdAt`

## 트러블슈팅

- `EADDRINUSE: :::8080`
  - 8080 포트를 이미 다른 프로세스가 사용 중입니다. 해당 프로세스를 종료 후 다시 실행하세요.
- `npm run build`가 루트에서 실패
  - `frontend` 폴더에서 실행하거나, 루트에서 `npm --prefix frontend run build`를 사용하세요.
  