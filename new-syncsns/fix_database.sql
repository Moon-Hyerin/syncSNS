-- 게시글 발행 문제 해결을 위한 데이터베이스 스키마 수정

-- 1. 기존 post_platforms 테이블의 max_retries 필드에 기본값 설정
UPDATE post_platforms 
SET max_retries = 3 
WHERE max_retries IS NULL;

-- 2. 기존 post_platforms 테이블의 retry_count 필드에 기본값 설정
UPDATE post_platforms 
SET retry_count = 0 
WHERE retry_count IS NULL;

-- 3. 필요한 경우 컬럼 기본값 변경
ALTER TABLE post_platforms ALTER COLUMN max_retries SET DEFAULT 3;
ALTER TABLE post_platforms ALTER COLUMN retry_count SET DEFAULT 0;

-- 4. 기존 posts 테이블의 status 필드 확인 및 수정
UPDATE posts 
SET status = 'draft' 
WHERE status IS NULL;

-- 5. 인덱스 재생성 (성능 향상을 위해)
REINDEX TABLE post_platforms;
REINDEX TABLE posts;

-- 6. 통계 업데이트
ANALYZE post_platforms;
ANALYZE posts; 