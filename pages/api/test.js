// 간단한 테스트 API - 디버깅용
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 10,
}

// 스트리밍으로 데이터 읽기
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    const maxSize = 15 * 1024 * 1024 // 15MB 제한

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
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('테스트 API 시작')
    
    const rawData = await getRawBody(req)
    const dataSize = rawData.length
    
    console.log(`받은 데이터 크기: ${(dataSize / 1024 / 1024).toFixed(2)}MB`)
    
    // JSON 파싱 테스트
    const jsonData = JSON.parse(rawData)
    const keys = Object.keys(jsonData)
    
    console.log('JSON 파싱 성공')
    console.log('최상위 키들:', keys.slice(0, 5))
    
    return res.status(200).json({
      success: true,
      dataSize: dataSize,
      dataSizeMB: (dataSize / 1024 / 1024).toFixed(2),
      topLevelKeys: keys.slice(0, 10),
      totalKeys: keys.length
    })
    
  } catch (error) {
    console.error('테스트 API 오류:', error.message)
    return res.status(500).json({
      error: error.message,
      details: '테스트 API에서 오류 발생'
    })
  }
} 