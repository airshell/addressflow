import { Request, Response, NextFunction } from 'express';
import { UsageRepository } from '@addressflow/server';

export class UsageController {
  constructor(private usageRepo?: UsageRepository) {}

  public getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.usageRepo) {
        res.json({
          data: {
            projectId: req.auth!.projectId,
            totalRequests: 0,
            applicationMatches: 0,
            coalescedRequests: 0,
            outOfBoundsBlockedRequests: 0,
            providerRequests: 0,
            providerErrors: 0,
            optimizationRatio: 0,
            averageLatencyMs: 0,
          },
        });
        return;
      }

      const summary = await this.usageRepo.getMetricsSummary(req.auth!.projectId);
      res.json({ data: summary });
    } catch (err) {
      next(err);
    }
  };
}
