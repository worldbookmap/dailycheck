# Vercel + GitHub JSON 저장 설정

이 프로젝트는 브라우저에서 직접 GitHub 토큰을 쓰지 않고, Vercel Serverless Function([api/records.js](api/records.js))를 통해 저장소 JSON 파일을 읽고/수정합니다.

## 1) 저장소에 포함된 데이터 파일
- [data/dailycheck-data.json](data/dailycheck-data.json)

## 2) Vercel 환경변수 설정
Vercel Project Settings -> Environment Variables 에 아래 값을 추가하세요.

- `GITHUB_TOKEN`
  - 권한: `contents:write` 가능한 GitHub Personal Access Token
- `GITHUB_OWNER`
  - 예: `worldbookmap`
- `GITHUB_REPO`
  - 예: `dailycheck`
- `GITHUB_BRANCH`
  - 예: `main`
- `GITHUB_FILE_PATH`
  - 예: `data/dailycheck-data.json`

## 3) 동작 방식
- 앱 로딩 또는 "GitHub 새로고침" 클릭: `GET /api/records`
- 기록 저장 클릭: `POST /api/records`
- 서버 함수가 GitHub Contents API로 JSON 파일을 읽고 커밋으로 업데이트

## 4) 주의사항
- 비공개 저장소라면 `GITHUB_TOKEN`이 없을 때 읽기/쓰기 모두 실패합니다.
- 토큰은 절대 프론트 코드에 넣지 마세요. 반드시 Vercel 서버 환경변수로만 관리하세요.
