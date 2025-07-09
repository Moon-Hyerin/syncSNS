-- 데이터베이스 시간대를 한국 시간으로 설정하는 스크립트
-- 이 스크립트는 기존 테이블들의 기본값을 한국 시간으로 변경합니다

-- 1. 세션 시간대를 한국 시간으로 설정
SET TIME ZONE 'Asia/Seoul';

-- 2. 한국 시간 기준 NOW() 함수 생성
CREATE OR REPLACE FUNCTION now_korea() 
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN NOW() AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql;

-- 3. 기존 트리거 함수를 한국 시간으로 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW() AT TIME ZONE 'Asia/Seoul';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. social_connections 테이블의 기본값 변경
ALTER TABLE social_connections 
ALTER COLUMN connected_at SET DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul');

ALTER TABLE social_connections 
ALTER COLUMN created_at SET DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul');

ALTER TABLE social_connections 
ALTER COLUMN updated_at SET DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul');

-- 5. posts 테이블의 기본값 변경
ALTER TABLE posts 
ALTER COLUMN created_at SET DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul');

ALTER TABLE posts 
ALTER COLUMN updated_at SET DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul');

-- 6. post_platforms 테이블의 기본값 변경
ALTER TABLE post_platforms 
ALTER COLUMN created_at SET DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul');

ALTER TABLE post_platforms 
ALTER COLUMN updated_at SET DEFAULT (NOW() AT TIME ZONE 'Asia/Seoul');

-- 7. 기존 레코드들의 시간을 한국 시간으로 업데이트 (선택사항)
-- 주의: 이 부분은 데이터양이 많으면 시간이 오래 걸릴 수 있습니다
-- 필요에 따라 주석을 해제하고 사용하세요

-- UPDATE social_connections 
-- SET connected_at = connected_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul',
--     created_at = created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul',
--     updated_at = updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'
-- WHERE connected_at IS NOT NULL;

-- UPDATE posts 
-- SET created_at = created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul',
--     updated_at = updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul',
--     published_at = CASE 
--         WHEN published_at IS NOT NULL 
--         THEN published_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'
--         ELSE NULL 
--     END,
--     scheduled_at = CASE 
--         WHEN scheduled_at IS NOT NULL 
--         THEN scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'
--         ELSE NULL 
--     END;

-- UPDATE post_platforms 
-- SET created_at = created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul',
--     updated_at = updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul',
--     published_at = CASE 
--         WHEN published_at IS NOT NULL 
--         THEN published_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'
--         ELSE NULL 
--     END;

-- 8. 변경사항 확인을 위한 뷰 생성
CREATE OR REPLACE VIEW v_timezone_check AS
SELECT 
    'social_connections' as table_name,
    'connected_at' as column_name,
    column_default
FROM information_schema.columns 
WHERE table_name = 'social_connections' 
  AND column_name = 'connected_at'
UNION ALL
SELECT 
    'posts' as table_name,
    'created_at' as column_name,
    column_default
FROM information_schema.columns 
WHERE table_name = 'posts' 
  AND column_name = 'created_at'
UNION ALL
SELECT 
    'post_platforms' as table_name,
    'created_at' as column_name,
    column_default
FROM information_schema.columns 
WHERE table_name = 'post_platforms' 
  AND column_name = 'created_at';

-- 9. 현재 시간대 설정 확인
SELECT 
    'Current database timezone: ' || current_setting('timezone') as info
UNION ALL
SELECT 
    'Current timestamp: ' || NOW()::text as info
UNION ALL
SELECT 
    'Korea time: ' || (NOW() AT TIME ZONE 'Asia/Seoul')::text as info;

-- 10. 테이블 코멘트 추가
COMMENT ON FUNCTION now_korea() IS '한국 시간 기준 현재 시간을 반환하는 함수';
COMMENT ON VIEW v_timezone_check IS '테이블별 시간대 설정 확인용 뷰';

-- 완료 메시지
SELECT '데이터베이스 시간대 설정이 한국 시간으로 업데이트되었습니다.' as result; 