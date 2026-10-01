import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AddressFlowService, AddressRepository } from '@addressflow/server';

const searchSchema = z.object({
  query: z.string().min(1).max(255),
  countryCode: z.string().length(2).optional(),
  language: z.string().optional(),
  sessionToken: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

const resolveSchema = z.object({
  identifier: z.string().min(1),
  provider: z.string().optional(),
  sessionToken: z.string().optional(),
  language: z.string().optional(),
});

const reverseSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  language: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

export class AddressController {
  constructor(
    private service: AddressFlowService,
    private addressRepo?: AddressRepository
  ) {}

  public search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = searchSchema.parse(req.body);
      const result = await this.service.search(dto, req.auth!, req.requestId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  public resolve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = resolveSchema.parse(req.body);
      const result = await this.service.resolve(dto, req.auth!, req.requestId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  public reverse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = reverseSchema.parse(req.body);
      const result = await this.service.reverse(dto, req.auth!, req.requestId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.addressRepo) {
        res.status(501).json({ error: { code: 'DATABASE_ERROR', message: 'Address persistence not configured' } });
        return;
      }
      const address = req.body;
      const id = await this.addressRepo.saveAddress(address, req.auth!.projectId);
      res.status(201).json({ data: { id } });
    } catch (err) {
      next(err);
    }
  };
}
