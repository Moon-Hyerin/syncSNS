'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// 인증이 필요한 페이지에서 사용하는 커스텀 훅
// 인증되지 않은 사용자는 로그인 페이지로 이동
export default function useAuthGuard(setUser) {
  const router = useRouter();

  // setUser 함수를 useCallback으로 메모이제이션
  const memoizedSetUser = useCallback(setUser, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 세션 정보를 확인하여 사용자 인증 상태 파악
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('세션 확인 오류:', error);
          router.push('/login');
          return;
        }
        
        if (!session || !session.user) {
          console.log('세션 없음 - 로그인 페이지로 이동');
          router.push('/login');
          return;
        }
        
        // 세션이 유효한 경우 사용자 정보 설정 (선택사항)
        if (memoizedSetUser) {
          memoizedSetUser(session.user);
        }
        
      } catch (err) {
        console.error('인증 확인 중 오류:', err);
        router.push('/login');
      }
    };

    checkSession();
  }, [router]); // 의존성 배열에서 memoizedSetUser 제거하여 무한루프 방지
} 