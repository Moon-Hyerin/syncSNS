-- 통합 SNS 연동 정보를 저장하는 테이블 생성
CREATE TABLE IF NOT EXISTS social_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 플랫폼 정보
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'twitter', 'threads', 'facebook' 등
  platform_user_id VARCHAR(255) NOT NULL, -- 각 플랫폼에서 제공하는 사용자 ID
  
  -- 계정 정보 (변경되지 않는 정보만)
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_picture_url TEXT,
  
  -- 인증 정보
  access_token TEXT NOT NULL,
  refresh_token TEXT, -- 지원하는 플랫폼의 경우
  token_type VARCHAR(50) DEFAULT 'bearer',
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- 상태 관리
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  
  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id 
ON social_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_social_connections_platform 
ON social_connections(platform);

CREATE INDEX IF NOT EXISTS idx_social_connections_is_active 
ON social_connections(is_active);

-- 사용자별 플랫폼별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_social_connections_user_platform 
ON social_connections(user_id, platform);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 연동 정보만 관리할 수 있음
CREATE POLICY "Users can view their own social connections" 
ON social_connections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social connections" 
ON social_connections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social connections" 
ON social_connections FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social connections" 
ON social_connections FOR DELETE 
USING (auth.uid() = user_id);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_social_connections_updated_at 
    BEFORE UPDATE ON social_connections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 테이블에 대한 코멘트 추가
COMMENT ON TABLE social_connections IS '통합 SNS 계정 연동 정보를 저장하는 테이블';
COMMENT ON COLUMN social_connections.user_id IS '연동한 사용자의 ID (auth.users 테이블 참조)';
COMMENT ON COLUMN social_connections.platform IS 'SNS 플랫폼 종류 (instagram, twitter, threads 등)';
COMMENT ON COLUMN social_connections.platform_user_id IS '각 플랫폼에서 제공하는 사용자 ID';
COMMENT ON COLUMN social_connections.username IS '플랫폼 사용자명';
COMMENT ON COLUMN social_connections.access_token IS '플랫폼 API 액세스 토큰';
COMMENT ON COLUMN social_connections.is_active IS '연동 활성 상태 (true: 활성, false: 해제됨)';

-- ==========================================
-- 게시글 관련 테이블들
-- ==========================================

-- 게시글 기본 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 게시글 내용
  content TEXT NOT NULL,
  images JSONB, -- Supabase Storage URL 배열 저장
  
  -- 발행 설정 (예약 발행 확장용)
  publish_type VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'scheduled'
  scheduled_at TIMESTAMP WITH TIME ZONE, -- 예약 발행 시간
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul', -- 사용자 시간대
  
  -- 발행 상태
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'failed', 'scheduled'
  
  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- 플랫폼별 발행 상태를 저장하는 테이블
CREATE TABLE IF NOT EXISTS post_platforms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'twitter'
  
  -- 발행 상태
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'published', 'failed'
  platform_post_id VARCHAR(255), -- 각 플랫폼에서 반환하는 게시글 ID
  error_message TEXT,
  
  -- 발행 시도 정보
  published_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기존 데이터에 max_retries 기본값 설정
UPDATE post_platforms 
SET max_retries = 3 
WHERE max_retries IS NULL;

-- 게시글 테이블 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);

-- 플랫폼별 발행 상태 테이블 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_post_platforms_post_id ON post_platforms(post_id);
CREATE INDEX IF NOT EXISTS idx_post_platforms_platform ON post_platforms(platform);
CREATE INDEX IF NOT EXISTS idx_post_platforms_status ON post_platforms(status);

-- 게시글 테이블 RLS 정책 설정
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own posts" 
ON posts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts" 
ON posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON posts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON posts FOR DELETE 
USING (auth.uid() = user_id);

-- 플랫폼별 발행 상태 테이블 RLS 정책 설정
ALTER TABLE post_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own post platforms" 
ON post_platforms FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM posts WHERE id = post_id));

CREATE POLICY "Users can insert their own post platforms" 
ON post_platforms FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM posts WHERE id = post_id));

CREATE POLICY "Users can update their own post platforms" 
ON post_platforms FOR UPDATE 
USING (auth.uid() = (SELECT user_id FROM posts WHERE id = post_id));

CREATE POLICY "Users can delete their own post platforms" 
ON post_platforms FOR DELETE 
USING (auth.uid() = (SELECT user_id FROM posts WHERE id = post_id));

-- 게시글 테이블에 updated_at 트리거 추가
CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 플랫폼별 발행 상태 테이블에 updated_at 트리거 추가
CREATE TRIGGER update_post_platforms_updated_at 
    BEFORE UPDATE ON post_platforms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 게시글 테이블 코멘트 추가
COMMENT ON TABLE posts IS '사용자가 작성한 게시글 정보를 저장하는 테이블';
COMMENT ON COLUMN posts.user_id IS '게시글 작성자 ID (auth.users 테이블 참조)';
COMMENT ON COLUMN posts.content IS '게시글 내용';
COMMENT ON COLUMN posts.images IS 'Supabase Storage에 업로드된 이미지 URL 배열 (JSONB)';
COMMENT ON COLUMN posts.publish_type IS '발행 유형 (immediate: 즉시발행, scheduled: 예약발행)';
COMMENT ON COLUMN posts.scheduled_at IS '예약 발행 시간';
COMMENT ON COLUMN posts.status IS '게시글 상태 (draft: 임시저장, published: 발행완료, failed: 발행실패, scheduled: 예약됨)';

COMMENT ON TABLE post_platforms IS '플랫폼별 게시글 발행 상태를 저장하는 테이블';
COMMENT ON COLUMN post_platforms.post_id IS '게시글 ID (posts 테이블 참조)';
COMMENT ON COLUMN post_platforms.platform IS '발행 플랫폼 (instagram, twitter 등)';
COMMENT ON COLUMN post_platforms.status IS '플랫폼별 발행 상태 (pending: 대기중, published: 발행완료, failed: 발행실패)';
COMMENT ON COLUMN post_platforms.platform_post_id IS '각 플랫폼에서 반환하는 게시글 ID';
COMMENT ON COLUMN post_platforms.retry_count IS '발행 재시도 횟수';
COMMENT ON COLUMN post_platforms.max_retries IS '최대 재시도 횟수 (기본값: 3)';

-- ==========================================
-- Supabase Storage 정책 설정
-- ==========================================

-- 'images' 버킷에 대한 RLS 정책 설정
-- 사용자는 자신의 이미지만 업로드, 조회, 삭제할 수 있음

-- 이미지 업로드 정책 (사용자 ID가 파일 경로에 포함된 경우만 허용)
CREATE POLICY "Users can upload their own images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 이미지 조회 정책 (사용자 ID가 파일 경로에 포함된 경우만 허용)
CREATE POLICY "Users can view their own images" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 이미지 삭제 정책 (사용자 ID가 파일 경로에 포함된 경우만 허용)
CREATE POLICY "Users can delete their own images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 이미지 업데이트 정책 (사용자 ID가 파일 경로에 포함된 경우만 허용)
CREATE POLICY "Users can update their own images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 'images' 버킷이 공개적으로 접근 가능하도록 설정
-- (이미지 URL을 통한 직접 접근 허용)
CREATE POLICY "Public can view images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'images');

-- Storage 버킷 RLS 활성화
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- 버킷 관련 정책 (필요한 경우)
CREATE POLICY "Users can view images bucket" 
ON storage.buckets FOR SELECT 
USING (id = 'images');

-- Storage 정책 관련 코멘트
COMMENT ON POLICY "Users can upload their own images" ON storage.objects IS '사용자는 자신의 이미지만 업로드할 수 있음 (파일 경로에 사용자 ID 포함)';
COMMENT ON POLICY "Users can view their own images" ON storage.objects IS '사용자는 자신의 이미지만 조회할 수 있음';
COMMENT ON POLICY "Users can delete their own images" ON storage.objects IS '사용자는 자신의 이미지만 삭제할 수 있음';
COMMENT ON POLICY "Public can view images" ON storage.objects IS '공개적으로 이미지에 접근할 수 있음 (URL을 통한 직접 접근)'; 