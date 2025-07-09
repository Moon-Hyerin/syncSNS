'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getKoreanTime } from '@/lib/dateUtils';

/**
 * 소셜 계정 연동 상태를 관리하는 커스텀 훅
 * @param {string} userId - 사용자 ID
 * @param {Object} options - 옵션 설정
 * @param {string} options.platform - 특정 플랫폼만 조회할 경우
 * @param {boolean} options.autoFetch - 자동으로 데이터를 가져올지 여부 (기본값: true)
 * @returns {Object} 연동 상태와 관련 함수들
 */
export default function useSocialConnections(userId, options = {}) {
  const { platform = null, autoFetch = true } = options;
  
  // 상태 관리
  const [connections, setConnections] = useState([]);
  const [groupedConnections, setGroupedConnections] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // 연동된 계정 정보 가져오기
  const fetchConnections = useCallback(async (targetUserId = userId) => {
    if (!targetUserId) {
      setError('사용자 ID가 필요합니다.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Supabase에서 현재 세션 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('인증이 필요합니다.');
      }

      // API 호출 URL 구성
      const apiUrl = new URL('/api/social/connections', window.location.origin);
      apiUrl.searchParams.append('userId', targetUserId);
      if (platform) {
        apiUrl.searchParams.append('platform', platform);
      }

      // 연동된 계정 정보 가져오기
      const response = await fetch(apiUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // 응답이 JSON인지 확인하기 위해 Content-Type 체크
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        let errorMessage = '연동 계정 정보를 가져오는데 실패했습니다.';
        
        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('JSON 파싱 오류:', jsonError);
            errorMessage = `서버 오류 (${response.status}): ${response.statusText}`;
          }
        } else {
          errorMessage = `서버 오류 (${response.status}): ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      let data;
      if (isJson) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('응답 JSON 파싱 오류:', jsonError);
          throw new Error('서버 응답을 처리하는데 실패했습니다.');
        }
      } else {
        throw new Error('서버에서 올바르지 않은 응답을 받았습니다.');
      }
      
      if (data.success) {
        setConnections(data.connections || []);
        setGroupedConnections(data.groupedConnections || {});
        setLastFetchTime(getKoreanTime());
        
        console.log('연동 계정 정보 조회 성공:', {
          totalCount: data.totalCount,
          platforms: Object.keys(data.groupedConnections || {})
        });
      } else {
        throw new Error(data.error || '연동 계정 정보 조회에 실패했습니다.');
      }
    } catch (fetchError) {
      console.error('연동 계정 확인 오류:', fetchError);
      setError(fetchError.message || '연동 계정 정보를 확인하는 중 오류가 발생했습니다.');
      setConnections([]);
      setGroupedConnections({});
    } finally {
      setIsLoading(false);
    }
  }, [userId, platform]);

  // 특정 플랫폼의 연동 상태 확인
  const isConnected = useCallback((targetPlatform) => {
    return connections.some(conn => 
      conn.platform === targetPlatform && conn.is_active
    );
  }, [connections]);

  // 특정 플랫폼의 연동 계정 정보 가져오기
  const getConnection = useCallback((targetPlatform) => {
    return connections.find(conn => 
      conn.platform === targetPlatform && conn.is_active
    );
  }, [connections]);

  // 연동된 모든 플랫폼 목록 가져오기
  const getConnectedPlatforms = useCallback(() => {
    return connections
      .filter(conn => conn.is_active)
      .map(conn => conn.platform);
  }, [connections]);

  // 플랫폼별 연동 상태 객체 생성
  const getPlatformStatus = useCallback((platformList) => {
    const connectedPlatforms = getConnectedPlatforms();
    return platformList.map(platform => ({
      ...platform,
      connected: connectedPlatforms.includes(platform.id),
      connectionInfo: getConnection(platform.id)
    }));
  }, [getConnectedPlatforms, getConnection]);

  // 연동 상태 새로고침
  const refreshConnections = useCallback(() => {
    return fetchConnections();
  }, [fetchConnections]);

  // 연동 계정 추가 후 상태 업데이트
  const addConnection = useCallback((connectionData) => {
    setConnections(prev => {
      // 기존 연동 정보가 있는지 확인
      const existingIndex = prev.findIndex(conn => 
        conn.platform === connectionData.platform && 
        conn.platform_user_id === connectionData.platform_user_id
      );
      
      if (existingIndex >= 0) {
        // 기존 연동 정보 업데이트
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...connectionData };
        return updated;
      } else {
        // 새 연동 정보 추가
        return [...prev, connectionData];
      }
    });
    
    // 그룹화된 연동 정보도 업데이트
    setGroupedConnections(prev => {
      const updated = { ...prev };
      if (!updated[connectionData.platform]) {
        updated[connectionData.platform] = [];
      }
      
      const existingIndex = updated[connectionData.platform].findIndex(conn =>
        conn.platform_user_id === connectionData.platform_user_id
      );
      
      if (existingIndex >= 0) {
        updated[connectionData.platform][existingIndex] = connectionData;
      } else {
        updated[connectionData.platform].push(connectionData);
      }
      
      return updated;
    });
  }, []);

  // 연동 계정 제거 후 상태 업데이트
  const removeConnection = useCallback((targetPlatform, platformUserId) => {
    setConnections(prev => 
      prev.filter(conn => 
        !(conn.platform === targetPlatform && conn.platform_user_id === platformUserId)
      )
    );
    
    setGroupedConnections(prev => {
      const updated = { ...prev };
      if (updated[targetPlatform]) {
        updated[targetPlatform] = updated[targetPlatform].filter(conn =>
          conn.platform_user_id !== platformUserId
        );
        if (updated[targetPlatform].length === 0) {
          delete updated[targetPlatform];
        }
      }
      return updated;
    });
  }, []);

  // 컴포넌트 마운트 시 자동으로 데이터 가져오기
  useEffect(() => {
    if (autoFetch && userId) {
      fetchConnections();
    }
  }, [autoFetch, userId, fetchConnections]);

  return {
    // 데이터
    connections,
    groupedConnections,
    
    // 상태
    isLoading,
    error,
    lastFetchTime,
    
    // 유틸리티 함수
    isConnected,
    getConnection,
    getConnectedPlatforms,
    getPlatformStatus,
    
    // 액션 함수
    fetchConnections,
    refreshConnections,
    addConnection,
    removeConnection,
    
    // 상태 관리 함수
    setError,
    clearError: () => setError('')
  };
} 