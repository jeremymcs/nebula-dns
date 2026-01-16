// Nebula DNS - Report Worker Service - Redis Queue Consumer
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package queue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/nebuladns/report-svc/internal/metrics"
	"github.com/nebuladns/report-svc/internal/models"
	"github.com/nebuladns/report-svc/internal/reports"
)

const (
	// ReportJobsChannel is the Redis pub/sub channel for report jobs
	ReportJobsChannel = "report_jobs"

	// ReportStatusChannel is the Redis pub/sub channel for job status updates
	ReportStatusChannel = "report_status"

	// ReportResultsPrefix is the Redis key prefix for storing report results
	ReportResultsPrefix = "report:result:"

	// ResultExpiration is how long report results are kept in Redis
	ResultExpiration = 24 * time.Hour
)

// Consumer handles consuming report jobs from Redis
type Consumer struct {
	redisClient   *redis.Client
	reportService *reports.Service
	metrics       *metrics.Metrics
	logger        *zap.Logger
	done          chan struct{}
}

// NewConsumer creates a new report job consumer
func NewConsumer(redisClient *redis.Client, reportService *reports.Service, m *metrics.Metrics, logger *zap.Logger) *Consumer {
	return &Consumer{
		redisClient:   redisClient,
		reportService: reportService,
		metrics:       m,
		logger:        logger,
		done:          make(chan struct{}),
	}
}

// Start begins consuming report jobs from Redis pub/sub
func (c *Consumer) Start(ctx context.Context) error {
	c.logger.Info("Starting report job consumer", zap.String("channel", ReportJobsChannel))

	pubsub := c.redisClient.Subscribe(ctx, ReportJobsChannel)
	defer pubsub.Close()

	// Wait for subscription confirmation
	_, err := pubsub.Receive(ctx)
	if err != nil {
		return err
	}

	ch := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Consumer context cancelled, shutting down")
			return ctx.Err()
		case <-c.done:
			c.logger.Info("Consumer stopped")
			return nil
		case msg := <-ch:
			if msg == nil {
				continue
			}
			go c.processMessage(ctx, msg)
		}
	}
}

// Stop gracefully stops the consumer
func (c *Consumer) Stop() {
	close(c.done)
}

// processMessage processes a single report job message
func (c *Consumer) processMessage(ctx context.Context, msg *redis.Message) {
	c.logger.Debug("Received message", zap.String("payload", msg.Payload))
	c.metrics.IncrementJobsReceived()

	var req models.ReportRequest
	if err := json.Unmarshal([]byte(msg.Payload), &req); err != nil {
		c.logger.Error("Failed to parse report request",
			zap.Error(err),
			zap.String("payload", msg.Payload),
		)
		c.metrics.IncrementJobsFailed()
		return
	}

	// Validate request
	if err := c.validateRequest(&req); err != nil {
		c.logger.Error("Invalid report request",
			zap.Error(err),
			zap.String("job_id", req.JobID),
		)
		c.publishStatus(ctx, &models.JobUpdate{
			JobID:  req.JobID,
			Status: models.JobStatusFailed,
			Error:  err.Error(),
		})
		c.metrics.IncrementJobsFailed()
		return
	}

	// Update status to generating
	c.publishStatus(ctx, &models.JobUpdate{
		JobID:  req.JobID,
		Status: models.JobStatusGenerating,
	})

	// Generate report with timeout
	reportCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	report, err := c.reportService.Generate(reportCtx, &req)
	if err != nil {
		c.logger.Error("Failed to generate report",
			zap.Error(err),
			zap.String("job_id", req.JobID),
		)
		c.publishStatus(ctx, &models.JobUpdate{
			JobID:  req.JobID,
			Status: models.JobStatusFailed,
			Error:  err.Error(),
		})
		c.metrics.IncrementJobsFailed()
		return
	}

	// Store result in Redis
	if err := c.storeResult(ctx, report); err != nil {
		c.logger.Error("Failed to store report result",
			zap.Error(err),
			zap.String("job_id", req.JobID),
		)
		c.publishStatus(ctx, &models.JobUpdate{
			JobID:  req.JobID,
			Status: models.JobStatusFailed,
			Error:  "Failed to store report result",
		})
		c.metrics.IncrementJobsFailed()
		return
	}

	// Update status to completed
	c.publishStatus(ctx, &models.JobUpdate{
		JobID:       req.JobID,
		Status:      models.JobStatusCompleted,
		CompletedAt: report.GeneratedAt,
		Filename:    report.Filename,
	})
	c.metrics.IncrementJobsCompleted()

	c.logger.Info("Report job completed",
		zap.String("job_id", req.JobID),
		zap.String("filename", report.Filename),
	)
}

// validateRequest validates a report request
func (c *Consumer) validateRequest(req *models.ReportRequest) error {
	if req.JobID == "" {
		return ErrMissingJobID
	}
	if req.TenantID == "" {
		return ErrMissingTenantID
	}
	if req.ReportType == "" {
		return ErrMissingReportType
	}
	if req.Format == "" {
		req.Format = models.ReportFormatPDF // Default to PDF
	}
	if req.DateRange.Start.IsZero() || req.DateRange.End.IsZero() {
		// Default to last 7 days
		now := time.Now()
		req.DateRange = models.DateRange{
			Start: now.AddDate(0, 0, -7),
			End:   now,
		}
	}
	return nil
}

// publishStatus publishes a job status update to Redis
func (c *Consumer) publishStatus(ctx context.Context, update *models.JobUpdate) {
	data, err := json.Marshal(update)
	if err != nil {
		c.logger.Error("Failed to marshal job update", zap.Error(err))
		return
	}

	if err := c.redisClient.Publish(ctx, ReportStatusChannel, data).Err(); err != nil {
		c.logger.Error("Failed to publish job status",
			zap.Error(err),
			zap.String("job_id", update.JobID),
		)
	}
}

// storeResult stores the report result in Redis
func (c *Consumer) storeResult(ctx context.Context, report *models.Report) error {
	key := ReportResultsPrefix + report.JobID

	// Store report metadata
	meta := map[string]interface{}{
		"job_id":       report.JobID,
		"tenant_id":    report.TenantID,
		"report_type":  string(report.ReportType),
		"format":       string(report.Format),
		"filename":     report.Filename,
		"generated_at": report.GeneratedAt.Format(time.RFC3339),
		"size_bytes":   len(report.Data),
	}

	metaData, err := json.Marshal(meta)
	if err != nil {
		return err
	}

	// Use a pipeline for atomic operations
	pipe := c.redisClient.Pipeline()
	pipe.Set(ctx, key+":meta", metaData, ResultExpiration)
	pipe.Set(ctx, key+":data", report.Data, ResultExpiration)
	_, err = pipe.Exec(ctx)

	return err
}

// GetResult retrieves a report result from Redis
func (c *Consumer) GetResult(ctx context.Context, jobID string) (*models.Report, error) {
	key := ReportResultsPrefix + jobID

	// Get metadata
	metaData, err := c.redisClient.Get(ctx, key+":meta").Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, ErrReportNotFound
		}
		return nil, err
	}

	var meta map[string]interface{}
	if err := json.Unmarshal(metaData, &meta); err != nil {
		return nil, err
	}

	// Get report data
	data, err := c.redisClient.Get(ctx, key+":data").Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, ErrReportNotFound
		}
		return nil, err
	}

	generatedAt, _ := time.Parse(time.RFC3339, meta["generated_at"].(string))

	return &models.Report{
		JobID:       jobID,
		TenantID:    meta["tenant_id"].(string),
		ReportType:  models.ReportType(meta["report_type"].(string)),
		Format:      models.ReportFormat(meta["format"].(string)),
		Filename:    meta["filename"].(string),
		Data:        data,
		GeneratedAt: generatedAt,
	}, nil
}

// Errors
var (
	ErrMissingJobID      = &ValidationError{Field: "job_id", Message: "job_id is required"}
	ErrMissingTenantID   = &ValidationError{Field: "tenant_id", Message: "tenant_id is required"}
	ErrMissingReportType = &ValidationError{Field: "report_type", Message: "report_type is required"}
	ErrReportNotFound    = &NotFoundError{Resource: "report"}
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

// NotFoundError represents a not found error
type NotFoundError struct {
	Resource string
}

func (e *NotFoundError) Error() string {
	return e.Resource + " not found"
}
