-- Supabase creators 테이블 생성 스크립트 (간소화 버전)
-- Supabase SQL Editor에서 실행하세요

-- 기존 테이블이 있다면 삭제 (선택사항)
-- DROP TABLE IF EXISTS creators;

CREATE TABLE IF NOT EXISTS creators (
    id BIGSERIAL PRIMARY KEY,
    aioCreatorID TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    followers INTEGER,
    sns TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_creators_aioCreatorID ON creators(aioCreatorID);
CREATE INDEX IF NOT EXISTS idx_creators_followers ON creators(followers);
CREATE INDEX IF NOT EXISTS idx_creators_created_at ON creators(created_at);

-- RLS (Row Level Security) 비활성화
ALTER TABLE creators DISABLE ROW LEVEL SECURITY;

-- 테이블 정보 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'creators'
ORDER BY ordinal_position; 