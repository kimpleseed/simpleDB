# SimpleDB - Creator Data Upload

JSON 파일을 업로드하여 Supabase에 크리에이터 데이터를 저장하는 웹 애플리케이션입니다.

## 기능

- JSON 파일 업로드
- 크리에이터 데이터 파싱 및 검증
- Supabase 데이터베이스에 저장
- 중복 데이터 방지
- 팔로워 수 기반 필터링 (1,000 ~ 10,000,000,000)
- 이메일 주소 자동 추출
- 업로드 결과 실시간 표시

## 설치 및 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 anon key 복사
3. `.env.local` 파일 생성:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. 데이터베이스 테이블 생성

Supabase SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행하세요.

### 4. 개발 서버 실행
```bash
npm run dev
```

http://localhost:3000 에서 애플리케이션을 확인할 수 있습니다.

## 사용 방법

1. 웹사이트에 접속
2. "JSON 파일 선택" 버튼 클릭
3. 크리에이터 데이터가 포함된 JSON 파일 선택
4. "업로드" 버튼 클릭
5. 업로드 결과 확인

## JSON 파일 형식

```json
{
  "baseResp": {
    "StatusCode": 0
  },
  "creators": [
    {
      "aioCreatorID": "creator_id",
      "creatorTTInfo": {
        "nickName": "닉네임",
        "handleName": "핸들",
        "bio": "소개 텍스트",
        "storeRegion": "국가",
        "isBannedInTT": false
      },
      "statisticData": {
        "overallPerformance": {
          "followerCount": 10000,
          "engagementRate": 5.2,
          "medianViews": 50000
        }
      },
      "esData": {
        "price": {
          "startingRate100k": 1000,
          "currency": "USD"
        }
      },
      "recentItems": []
    }
  ]
}
```

## 필터링 조건

- **팔로워 수**: 1,000 ~ 10,000,000,000
- **중복 방지**: aioCreatorID 기준
- **이메일 추출**: bio 텍스트에서 자동 추출

## 기술 스택

- **Frontend**: Next.js, React
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Styling**: CSS Modules

## 프로젝트 구조

```
simpleDB/
├── pages/
│   ├── index.js          # 메인 페이지
│   └── api/
│       └── upload.js     # 업로드 API
├── lib/
│   └── supabase.js       # Supabase 클라이언트
├── styles/
│   └── Home.module.css   # 스타일
├── supabase-schema.sql   # 데이터베이스 스키마
└── README.md
```

## 라이선스

MIT License 