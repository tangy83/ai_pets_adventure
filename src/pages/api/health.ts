import type { NextApiRequest, NextApiResponse } from 'next'

type HealthStatus = {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  memory: {
    used: number
    total: number
    free: number
  }
  version: string
  environment: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  // Get memory usage
  const memUsage = process.memoryUsage()
  const totalMem = require('os').totalmem()
  const freeMem = require('os').freemem()
  
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(totalMem / 1024 / 1024), // MB
      free: Math.round(freeMem / 1024 / 1024), // MB
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }

  // Set cache headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  res.status(200).json(healthStatus)
} 