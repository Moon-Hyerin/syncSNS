// Supabase 클라이언트 생성에 필요한 함수 import
import { createClient } from '@supabase/supabase-js'

// 환경변수에서 Supabase URL과 익명 키를 불러옴
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Supabase 클라이언트 인스턴스 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 인증 관련 헬퍼 함수 모음
export const auth = {
  // 회원가입 함수
  signUp: async (email, password) => {
    // 이메일과 비밀번호로 회원가입 요청
    return await supabase.auth.signUp({
      email,
      password,
    })
  },

  // 로그인 함수
  signIn: async (email, password) => {
    // 이메일과 비밀번호로 로그인 요청
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  },

  // 로그아웃 함수
  signOut: async () => {
    // 로그아웃 요청
    return await supabase.auth.signOut()
  },

  // 현재 로그인된 사용자 정보 가져오기
  getUser: async () => {
    return await supabase.auth.getUser()
  },

  // 현재 세션 정보 가져오기
  getSession: async () => {
    return await supabase.auth.getSession()
  }
} 