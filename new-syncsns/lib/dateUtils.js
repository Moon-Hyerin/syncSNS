/**
 * 한국 시간 관련 유틸리티 함수들
 */

/**
 * 현재 시간을 한국 시간 기준으로 ISO 문자열로 반환
 * @returns {string} 한국 시간 기준 ISO 문자열
 */
export function getKoreanTimeISO() {
  const now = new Date();
  // 한국 시간 = UTC + 9시간
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return koreanTime.toISOString();
}

/**
 * 특정 시간을 한국 시간 기준으로 ISO 문자열로 반환
 * @param {Date|string|number} date - 변환할 날짜/시간
 * @returns {string} 한국 시간 기준 ISO 문자열
 */
export function toKoreanTimeISO(date) {
  const targetDate = new Date(date);
  // 한국 시간 = UTC + 9시간
  const koreanTime = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000));
  return koreanTime.toISOString();
}

/**
 * 현재 시간을 한국 시간 기준으로 Date 객체로 반환
 * @returns {Date} 한국 시간 기준 Date 객체
 */
export function getKoreanTime() {
  const now = new Date();
  // 한국 시간 = UTC + 9시간
  return new Date(now.getTime() + (9 * 60 * 60 * 1000));
}

/**
 * 특정 시간을 한국 시간 기준으로 Date 객체로 반환
 * @param {Date|string|number} date - 변환할 날짜/시간
 * @returns {Date} 한국 시간 기준 Date 객체
 */
export function toKoreanTime(date) {
  const targetDate = new Date(date);
  // 한국 시간 = UTC + 9시간
  return new Date(targetDate.getTime() + (9 * 60 * 60 * 1000));
}

/**
 * 현재 시간에서 특정 시간을 더한 한국 시간 기준 ISO 문자열 반환
 * @param {number} additionalMilliseconds - 추가할 밀리초
 * @returns {string} 한국 시간 기준 ISO 문자열
 */
export function getKoreanTimeWithOffset(additionalMilliseconds = 0) {
  const now = new Date();
  // 한국 시간 = UTC + 9시간 + 추가 시간
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000) + additionalMilliseconds);
  return koreanTime.toISOString();
}

/**
 * 한국 시간 기준으로 포맷된 날짜 문자열 반환
 * @param {Date|string|number} date - 변환할 날짜/시간
 * @returns {string} 한국 시간 기준 포맷된 날짜 문자열 (YYYY-MM-DD HH:mm:ss)
 */
export function formatKoreanTime(date) {
  const koreanTime = toKoreanTime(date);
  return koreanTime.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Seoul'
  });
}

/**
 * 한국 시간 기준으로 날짜만 반환
 * @param {Date|string|number} date - 변환할 날짜/시간
 * @returns {string} 한국 시간 기준 날짜 문자열 (YYYY-MM-DD)
 */
export function formatKoreanDate(date) {
  const koreanTime = toKoreanTime(date);
  return koreanTime.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul'
  });
} 