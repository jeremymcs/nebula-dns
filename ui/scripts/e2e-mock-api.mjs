#!/usr/bin/env node
/**
 * Minimal HTTP stub for Playwright E2E so Next.js /backend proxy and the UI
 * can reach localhost:4010 without a full NestJS stack.
 */
import http from 'http'
import { getMockResponse } from '../e2e/fixtures/mock-api-data.mjs'

const port = Number(process.env.PORT || 4010)

const server = http.createServer((req, res) => {
  const url = req.url || '/'
  const method = req.method || 'GET'
  const authHeader = req.headers.authorization || ''

  const mock = getMockResponse(url, method, authHeader)
  res.writeHead(mock.status, { 'Content-Type': mock.contentType })
  res.end(mock.body)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`E2E mock API listening on http://127.0.0.1:${port}`)
})
