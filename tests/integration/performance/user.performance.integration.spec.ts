import request from 'supertest';
import { Application as ExpressApp } from 'express';
import { DataSource } from 'typeorm';
import Application from '../../../src/main';
import { DatabaseConnection } from '../../../src/infrastructure/database/typeorm/typeorm.config';
import { UserOrmEntity } from '../../../src/infrastructure/database/typeorm/entities/user.orm-entity';

describe('User Performance Integration Tests', () => {
  let app: ExpressApp;
  let dataSource: DataSource;
  let dbConnection: DatabaseConnection;
  let application: Application;

  const createValidUserData = (index: number) => ({
    name: `Performance Test User ${index}`,
    email: `perf${index}@example.com`,
    password: 'SecurePass123!',
    passwordConfirmation: 'SecurePass123!'
  });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_DATABASE = 'insightloop_perf_test';
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.LOG_LEVEL = 'error';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100'; // Higher limit for performance tests

    application = new Application();
    await application.initialize();
    app = application.getApp();

    dbConnection = DatabaseConnection.getInstance();
    dataSource = dbConnection.getDataSource();
  });

  beforeEach(async () => {
    await dataSource.getRepository(UserOrmEntity).clear();
  });

  afterAll(async () => {
    await dataSource.getRepository(UserOrmEntity).clear();
    await dbConnection.disconnect();
  });

  describe('Load Testing', () => {
    it('should handle concurrent registration requests efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      // Create concurrent registration requests
      const registrationPromises = Array(concurrentRequests)
        .fill(null)
        .map((_, index) =>
          request(app)
            .post('/api/v1/users/register')
            .send(createValidUserData(index))
        );

      const results = await Promise.allSettled(registrationPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      );
      const failed = results.filter(r => 
        r.status === 'fulfilled' && r.value.status !== 201
      );

      console.log(`Concurrent Registrations Performance:
        - Total requests: ${concurrentRequests}
        - Successful: ${successful.length}
        - Failed: ${failed.length}
        - Total time: ${totalTime}ms
        - Average time per request: ${totalTime / concurrentRequests}ms
        - Requests per second: ${(concurrentRequests / (totalTime / 1000)).toFixed(2)}
      `);

      // Performance assertions
      expect(successful.length).toBeGreaterThan(15); // At least 75% success rate
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(totalTime / concurrentRequests).toBeLessThan(500); // Average < 500ms per request
    });

    it('should maintain response times under load', async () => {
      const requestCount = 50;
      const responseTimes: number[] = [];

      // Sequential requests to measure individual response times
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .post('/api/v1/users/register')
          .send(createValidUserData(i));
          
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        // All requests should succeed
        expect(response.status).toBe(201);
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(requestCount * 0.95)];

      console.log(`Response Time Statistics:
        - Average: ${avgResponseTime.toFixed(2)}ms
        - Min: ${minResponseTime}ms
        - Max: ${maxResponseTime}ms
        - 95th Percentile: ${p95ResponseTime}ms
      `);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(300); // Average under 300ms
      expect(maxResponseTime).toBeLessThan(1000); // Max under 1 second
      expect(p95ResponseTime).toBeLessThan(500); // 95% under 500ms
    });

    it('should handle burst traffic patterns', async () => {
      const burstSize = 10;
      const numberOfBursts = 5;
      const timeBetweenBursts = 1000; // 1 second

      const allResults: any[] = [];

      for (let burstIndex = 0; burstIndex < numberOfBursts; burstIndex++) {
        const burstStartTime = Date.now();

        // Create a burst of concurrent requests
        const burstPromises = Array(burstSize)
          .fill(null)
          .map((_, index) =>
            request(app)
              .post('/api/v1/users/register')
              .send(createValidUserData(burstIndex * burstSize + index))
          );

        const burstResults = await Promise.allSettled(burstPromises);
        const burstEndTime = Date.now();

        const successfulInBurst = burstResults.filter(r => 
          r.status === 'fulfilled' && r.value.status === 201
        ).length;

        allResults.push({
          burstIndex,
          successful: successfulInBurst,
          total: burstSize,
          duration: burstEndTime - burstStartTime
        });

        // Wait between bursts (except for the last one)
        if (burstIndex < numberOfBursts - 1) {
          await new Promise(resolve => setTimeout(resolve, timeBetweenBursts));
        }
      }

      console.log('Burst Pattern Results:', allResults);

      // Each burst should have high success rate
      allResults.forEach((burst, index) => {
        expect(burst.successful).toBeGreaterThan(burstSize * 0.8); // 80% success rate per burst
        expect(burst.duration).toBeLessThan(5000); // Each burst completes in under 5 seconds
      });
    });

    it('should handle gradual load increase', async () => {
      const loadSteps = [5, 10, 15, 20]; // Gradual increase in concurrent requests
      const results: any[] = [];

      for (const loadSize of loadSteps) {
        const startTime = Date.now();

        const promises = Array(loadSize)
          .fill(null)
          .map((_, index) =>
            request(app)
              .post('/api/v1/users/register')
              .send(createValidUserData(Date.now() + index)) // Unique emails
          );

        const stepResults = await Promise.allSettled(promises);
        const endTime = Date.now();

        const successful = stepResults.filter(r => 
          r.status === 'fulfilled' && r.value.status === 201
        ).length;

        results.push({
          loadSize,
          successful,
          total: loadSize,
          duration: endTime - startTime,
          successRate: (successful / loadSize) * 100
        });

        // Small delay between load steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('Gradual Load Results:', results);

      // Success rate should remain high across all load levels
      results.forEach(result => {
        expect(result.successRate).toBeGreaterThan(80); // 80% minimum success rate
      });

      // Response time shouldn't degrade significantly with load
      const avgDurations = results.map(r => r.duration / r.loadSize);
      const degradation = Math.max(...avgDurations) / Math.min(...avgDurations);
      expect(degradation).toBeLessThan(3); // No more than 3x degradation
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have significant memory leaks during sustained load', async () => {
      const iterations = 100;
      const memorySnapshots: number[] = [];

      // Take initial memory snapshot
      if (global.gc) {
        global.gc();
      }
      const initialMemory = process.memoryUsage();
      memorySnapshots.push(initialMemory.heapUsed);

      // Perform sustained operations
      for (let i = 0; i < iterations; i++) {
        await request(app)
          .post('/api/v1/users/register')
          .send(createValidUserData(Date.now() + i));

        // Take memory snapshots periodically
        if (i % 20 === 0) {
          if (global.gc) {
            global.gc();
          }
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }

      // Final memory snapshot
      if (global.gc) {
        global.gc();
      }
      const finalMemory = process.memoryUsage();
      memorySnapshots.push(finalMemory.heapUsed);

      console.log('Memory Usage Snapshots:', memorySnapshots.map(bytes => `${(bytes / 1024 / 1024).toFixed(2)}MB`));

      // Memory should not grow uncontrollably
      const memoryGrowth = (finalMemory.heapUsed - initialMemory.heapUsed) / initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(0.5); // Less than 50% growth
    });

    it('should handle database connection pool efficiently', async () => {
      const concurrentConnections = 30; // More than typical pool size
      const startTime = Date.now();

      // Create requests that would require database connections
      const connectionPromises = Array(concurrentConnections)
        .fill(null)
        .map(async (_, index) => {
          try {
            const response = await request(app)
              .post('/api/v1/users/register')
              .send(createValidUserData(Date.now() + index));
            return { success: response.status === 201 };
          } catch (error) {
            return { success: false, error: (error as Error).message };
          }
        });

      const results = await Promise.allSettled(connectionPromises);
      const endTime = Date.now();

      const successful = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).success
      ).length;

      console.log(`Connection Pool Performance:
        - Concurrent connections: ${concurrentConnections}
        - Successful: ${successful}
        - Duration: ${endTime - startTime}ms
      `);

      // Should handle more connections than pool size gracefully
      expect(successful).toBeGreaterThan(concurrentConnections * 0.7); // At least 70% success
      expect(endTime - startTime).toBeLessThan(15000); // Complete within 15 seconds
    });
  });

  describe('Database Performance', () => {
    it('should maintain query performance with large dataset', async () => {
      // First, populate database with test data
      const testDataSize = 1000;
      console.log(`Creating ${testDataSize} users for performance testing...`);

      const batchSize = 50;
      for (let i = 0; i < testDataSize; i += batchSize) {
        const batch = Array(Math.min(batchSize, testDataSize - i))
          .fill(null)
          .map((_, index) =>
            request(app)
              .post('/api/v1/users/register')
              .send(createValidUserData(i + index))
          );

        await Promise.all(batch);
      }

      // Test query performance with large dataset
      const queryTests = [
        {
          name: 'Email lookup',
          operation: () => request(app)
            .post('/api/v1/users/register')
            .send(createValidUserData(999999)) // This will check email uniqueness
        },
        {
          name: 'Registration with duplicate email',
          operation: () => request(app)
            .post('/api/v1/users/register')
            .send(createValidUserData(500)) // Try to register existing email
        }
      ];

      for (const test of queryTests) {
        const startTime = Date.now();
        await test.operation();
        const queryTime = Date.now() - startTime;

        console.log(`${test.name} query time with ${testDataSize} records: ${queryTime}ms`);
        expect(queryTime).toBeLessThan(1000); // Should be under 1 second
      }
    });

    it('should handle database timeouts gracefully', async () => {
      // This test simulates database under heavy load
      const heavyLoadRequests = 50;
      const timeoutThreshold = 5000; // 5 seconds

      const promises = Array(heavyLoadRequests)
        .fill(null)
        .map((_, index) => {
          const startTime = Date.now();
          return request(app)
            .post('/api/v1/users/register')
            .send(createValidUserData(Date.now() + index))
            .timeout(timeoutThreshold)
            .then(response => ({
              success: true,
              status: response.status,
              duration: Date.now() - startTime
            }))
            .catch(error => ({
              success: false,
              error: error.message,
              duration: Date.now() - startTime
            }));
        });

      const results = await Promise.all(promises);

      const successful = results.filter(r => r.success);
      const timedOut = results.filter(r => !r.success && (r as any).error?.includes('timeout'));
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      console.log(`Database Timeout Test Results:
        - Total requests: ${heavyLoadRequests}
        - Successful: ${successful.length}
        - Timed out: ${timedOut.length}
        - Average duration: ${avgDuration.toFixed(2)}ms
      `);

      // Even under heavy load, most requests should complete
      expect(successful.length).toBeGreaterThan(heavyLoadRequests * 0.6); // At least 60% success
      expect(timedOut.length).toBeLessThan(heavyLoadRequests * 0.2); // Less than 20% timeouts
    });
  });

  describe('Error Rate Under Load', () => {
    it('should maintain low error rates under sustained load', async () => {
      const sustainedDuration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      const results: any[] = [];
      let requestIndex = 0;

      while (Date.now() - startTime < sustainedDuration) {
        const requestStartTime = Date.now();
        
        try {
          const response = await request(app)
            .post('/api/v1/users/register')
            .send(createValidUserData(requestIndex++))
            .timeout(2000); // 2 second timeout

          results.push({
            success: true,
            status: response.status,
            duration: Date.now() - requestStartTime
          });
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
            duration: Date.now() - requestStartTime
          });
        }

        // Wait for next request interval
        const elapsed = Date.now() - requestStartTime;
        if (elapsed < requestInterval) {
          await new Promise(resolve => setTimeout(resolve, requestInterval - elapsed));
        }
      }

      const totalRequests = results.length;
      const successfulRequests = results.filter(r => r.success && r.status === 201).length;
      const errorRate = ((totalRequests - successfulRequests) / totalRequests) * 100;
      const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / totalRequests;

      console.log(`Sustained Load Test Results:
        - Duration: ${sustainedDuration / 1000} seconds
        - Total requests: ${totalRequests}
        - Successful: ${successfulRequests}
        - Error rate: ${errorRate.toFixed(2)}%
        - Average response time: ${avgResponseTime.toFixed(2)}ms
        - Requests per second: ${(totalRequests / (sustainedDuration / 1000)).toFixed(2)}
      `);

      // Performance assertions
      expect(errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(avgResponseTime).toBeLessThan(500); // Average response time under 500ms
      expect(totalRequests).toBeGreaterThan(200); // Should handle at least 200 requests in 30 seconds
    });
  });
});