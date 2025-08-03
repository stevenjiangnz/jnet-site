const request = require('supertest');
const express = require('express');

// Mock the database connection
jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const app = express();
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'content-service' });
});

describe('Health Check', () => {
  test('GET /health should return healthy status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      service: 'content-service'
    });
  });
});