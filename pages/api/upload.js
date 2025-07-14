// API 설정 - bodyParser 비활성화하고 스트리밍 방식 사용
export const config = {
  api: {
    bodyParser: false, // bodyParser 비활성화
  },
  maxDuration: 10, // Hobby 플랜 기준 10초
}

// 팔로워 수 필터 설정 (하드코딩)
const MIN_FOLLOWERS = 1000
const MAX_FOLLOWERS = 10000000000

// 이메일 추출 함수
function extractEmailFromBio(bio) {
  try {
    if (!bio || typeof bio !== 'string') return null
    
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    const matches = bio.match(emailPattern)
    return matches ? matches[0] : null
  } catch (error) {
    console.error('이메일 추출 오류:', error)
    return null
  }
}

// 팔로워 수 유효성 검사
function isFollowerCountValid(followerCount) {
  try {
    if (followerCount === null || followerCount === undefined) {
      return false
    }
    const count = parseInt(followerCount)
    if (isNaN(count)) return false
    return MIN_FOLLOWERS <= count && count <= MAX_FOLLOWERS
  } catch (error) {
    console.error('팔로워 수 검증 오류:', error)
    return false
  }
}

// 크리에이터 데이터인지 확인하는 함수
function isValidCreatorData(item) {
  try {
    if (!item || typeof item !== 'object') return false
    
    // 이미지 데이터나 기타 불필요한 데이터 필터링
    if (item.format && item.imageUrl) {
      return false // 이미지 데이터
    }
    
    // 크리에이터 관련 필드가 하나라도 있으면 유효한 것으로 간주
    const creatorFields = [
      'aioCreatorID', 'creatorTTInfo', 'statisticData',
      'nickName', 'handleName', 'bio', 'followerCount',
      'name', 'username', 'followers', 'id'
    ]
    
    return creatorFields.some(field => {
      if (item[field] !== undefined) return true
      if (item.creatorTTInfo && item.creatorTTInfo[field] !== undefined) return true
      if (item.statisticData?.overallPerformance && item.statisticData.overallPerformance[field] !== undefined) return true
      return false
    })
  } catch (error) {
    console.error('크리에이터 데이터 검증 오류:', error)
    return false
  }
}

// 다양한 JSON 구조에서 크리에이터 데이터 추출
function extractCreatorsFromAnyStructure(data) {
  try {
    let creators = []
    
    // 1. 표준 구조: data.creators
    if (data.creators && Array.isArray(data.creators)) {
      creators = data.creators.filter(isValidCreatorData)
      console.log('표준 creators 배열 발견:', creators.length + '개 (유효한 크리에이터)')
      return creators
    }
    
    // 2. 다른 가능한 구조들 탐색
    console.log('표준 creators 배열 없음, 다른 구조 탐색 중...')
    
    // JSON의 모든 키를 확인하여 배열 찾기 (깊이 제한)
    function findArraysInObject(obj, path = '', depth = 0) {
      if (depth > 3) return [] // 깊이 제한으로 성능 보호
      
      const arrays = []
      
      if (Array.isArray(obj)) {
        // 배열에서 유효한 크리에이터 데이터만 필터링
        const validCreators = obj.filter(isValidCreatorData)
        if (validCreators.length > 0) {
          arrays.push({ path, data: validCreators, totalLength: obj.length })
        }
      } else if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const newPath = path ? `${path}.${key}` : key
          arrays.push(...findArraysInObject(value, newPath, depth + 1))
        }
      }
      
      return arrays
    }
    
    const allArrays = findArraysInObject(data)
    console.log('발견된 크리에이터 배열들:', allArrays.map(a => ({ 
      path: a.path, 
      validCreators: a.data.length, 
      totalItems: a.totalLength 
    })))
    
    // 가장 많은 유효한 크리에이터 데이터를 가진 배열 선택
    if (allArrays.length > 0) {
      const bestArray = allArrays.reduce((max, current) => 
        current.data.length > max.data.length ? current : max
      )
      creators = bestArray.data
      console.log(`최적 배열 선택: ${bestArray.path} (${creators.length}개 유효한 크리에이터)`)
    }
    
    return creators
  } catch (error) {
    console.error('크리에이터 데이터 추출 오류:', error)
    return []
  }
}

// 크리에이터 데이터 파싱 (DB 저장 없이)
async function parseCreators(data) {
  // baseResp 확인 (선택사항)
  const base = data.baseResp || {}
  if (base.StatusCode && base.StatusCode !== 0) {
    console.warn(`API 경고: StatusCode=${base.StatusCode}`)
  }

  // 다양한 구조에서 크리에이터 데이터 추출
  const creators = extractCreatorsFromAnyStructure(data)
  
  if (!creators || creators.length === 0) {
    throw new Error('유효한 크리에이터 데이터를 찾을 수 없습니다. JSON 구조를 확인해주세요.')
  }

  const summaries = []
  let savedCount = 0
  let filteredCount = 0
  let duplicateCount = 0

  console.log(`총 ${creators.length}개의 유효한 크리에이터 데이터를 처리 중...`)

  for (const creator of creators) {
    console.log('=== 크리에이터 항목 분석 ===')
    
    // Python 코드와 동일한 구조로 데이터 추출
    const info = creator.creatorTTInfo || {}
    const perf = creator.statisticData?.overallPerformance || {}
    const price = creator.esData?.price || {}
    
    // bio에서 이메일 추출
    const bio = info.bio
    const email = extractEmailFromBio(bio)
    
    // 크리에이터 데이터 구성 (Python 코드와 동일)
    const creatorData = {
      aioCreatorID: creator.aioCreatorID,
      name: info.handleName, // handleName을 name으로 사용
      email: email,
      price: price.startingRate100k ? `${(price.startingRate100k / 100000).toFixed(1)} USD` : null, // Price 계산
      engagement: perf.engagementRate ? `${(perf.engagementRate * 100).toFixed(1)}%` : null, // Engagement 계산
      followers: perf.followerCount,
      sns: info.handleName ? `https://www.tiktok.com/@${info.handleName}` : '', // TikTok URL 생성
      // 추가 정보들
      bio: bio,
      country: info.storeRegion,
      isBanned: info.isBannedInTT,
      medianViews: perf.medianViews,
      currency: price.currency,
      recentItemsCount: creator.recentItems?.length || 0
    }

    console.log('=== 추출된 필드들 ===')
    console.log('aioCreatorID:', creatorData.aioCreatorID)
    console.log('name (handleName):', creatorData.name)
    console.log('email:', creatorData.email)
    console.log('price:', creatorData.price)
    console.log('engagement:', creatorData.engagement)
    console.log('followers:', creatorData.followers)
    console.log('sns (TikTok URL):', creatorData.sns)

    // 필수 필드 검증
    if (!creatorData.aioCreatorID) {
      console.log('⚠️ aioCreatorID가 없어서 건너뜀')
      continue
    }

    // DB 저장용 데이터 (필수 필드만)
    const dbData = {
      aioCreatorID: creatorData.aioCreatorID,
      name: creatorData.name || '알 수 없음', // handleName 사용
      email: creatorData.email,
      price: creatorData.price, // Price 추가
      engagement: creatorData.engagement, // Engagement 추가
      followers: parseInt(creatorData.followers) || 0,
      sns: creatorData.sns || '' // TikTok URL 사용
    }

    summaries.push(dbData)

    console.log(`처리 중: ${dbData.name} (팔로워: ${dbData.followers})`)

    // 팔로워 수 조건 확인 (DB 저장은 건너뜀)
    if (isFollowerCountValid(dbData.followers)) {
      savedCount++
      console.log(`✓ 조건 통과: ${dbData.name} (팔로워: ${dbData.followers?.toLocaleString()}, SNS: ${dbData.sns})`)
    } else {
      filteredCount++
      console.log(`✗ 필터됨: ${dbData.name} (팔로워: ${dbData.followers}) - 조건: ${MIN_FOLLOWERS} ~ ${MAX_FOLLOWERS}`)
    }
  }

  console.log(`처리 완료: 총 ${summaries.length}개, 조건 통과 ${savedCount}개, 필터 ${filteredCount}개`)
  console.log(`팔로워 수 조건: ${MIN_FOLLOWERS.toLocaleString()} ~ ${MAX_FOLLOWERS.toLocaleString()}`)

  return {
    total: summaries.length,
    saved: savedCount,
    duplicate: 0, // DB 저장 안하므로 중복 체크 없음
    filtered: filteredCount,
    minFollowers: MIN_FOLLOWERS,
    maxFollowers: MAX_FOLLOWERS,
    processedData: summaries // 전체 데이터 반환
  }
}

// 스트리밍으로 JSON 데이터 읽기
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    const maxSize = 10 * 1024 * 1024 // 10MB 제한

    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxSize) {
        reject(new Error('Request too large'))
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks)
        const body = buffer.toString('utf8')
        resolve(body)
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', (error) => {
      reject(error)
    })

    // 타임아웃 설정
    setTimeout(() => {
      reject(new Error('Request timeout'))
    }, 9000) // 9초 타임아웃
  })
}

export default async function handler(req, res) {
  // CORS 헤더 추가
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  console.log('=== API 요청 시작 ===', new Date().toISOString())

  try {
    // 요청 크기 확인
    const contentLength = req.headers['content-length']
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Request too large (max 5MB)' })
    }

    // 스트리밍으로 JSON 데이터 읽기
    let jsonData
    let rawJsonString
    try {
      rawJsonString = await getRawBody(req)
      
      // 기본 유효성 검사
      if (!rawJsonString || typeof rawJsonString !== 'string') {
        throw new Error('No valid JSON string received')
      }

      // JSON 파싱
      jsonData = JSON.parse(rawJsonString)

      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid JSON object')
      }

    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError.message)
      return res.status(400).json({ 
        error: 'JSON 파싱 실패: ' + parseError.message,
        details: 'JSON 형식이 올바른지 확인해주세요.'
      })
    }

    // 데이터 크기 계산 (안전하게)
    let dataSize = 0
    try {
      dataSize = rawJsonString.length
    } catch (stringifyError) {
      console.error('크기 계산 오류:', stringifyError)
      dataSize = 'unknown'
    }

    console.log(`JSON 데이터 처리 시작: ${typeof dataSize === 'number' ? (dataSize / 1024 / 1024).toFixed(2) + 'MB' : dataSize} (${typeof dataSize === 'number' ? dataSize.toLocaleString() : 'unknown'}자)`)

    // 크기 제한 확인
    if (typeof dataSize === 'number' && dataSize > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'JSON 데이터가 너무 큽니다. (최대 10MB)' })
    }

    // 데이터 구조 분석 (안전하게)
    console.log('JSON 구조 분석:')
    try {
      const keys = Object.keys(jsonData)
      console.log('- 최상위 키들:', keys.slice(0, 10)) // 처음 10개만 로그
      if (keys.length > 10) {
        console.log(`- 총 ${keys.length}개 키 (처음 10개만 표시)`)
      }
    } catch (keysError) {
      console.error('키 분석 오류:', keysError)
    }
    
    // 타임아웃 체크
    if (Date.now() - startTime > 8000) { // 8초 제한
      return res.status(408).json({ error: '처리 시간 초과' })
    }

    // 크리에이터 데이터 파싱
    const result = await parseCreators(jsonData)
    
    const processingTime = Date.now() - startTime
    console.log(`=== API 요청 완료 === (${processingTime}ms)`)
    
    res.status(200).json({
      ...result,
      processingTime: processingTime
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('=== API 오류 ===')
    console.error('오류 메시지:', error.message)
    console.error('오류 스택:', error.stack)
    console.error('처리 시간:', processingTime + 'ms')
    
    // 에러 타입별 처리
    if (error.message.includes('timeout') || error.message.includes('시간')) {
      return res.status(408).json({ 
        error: '처리 시간 초과: ' + error.message,
        processingTime: processingTime
      })
    }
    
    if (error.message.includes('memory') || error.message.includes('메모리')) {
      return res.status(507).json({ 
        error: '메모리 부족: ' + error.message,
        processingTime: processingTime
      })
    }

    res.status(500).json({ 
      error: error.message || '서버 내부 오류',
      processingTime: processingTime
    })
  }
}