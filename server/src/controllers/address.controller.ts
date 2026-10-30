import type { Request, Response } from 'express';
import type { AddressInput } from '../schemas/address.schema';
import * as addressService from '../services/address.service';
import { sendSuccess } from '../utils/response';

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response) {
  return sendSuccess(res, await addressService.list(req.user!.id));
}

export async function create(req: Request, res: Response) {
  return sendSuccess(res, await addressService.create(req.user!.id, req.body as AddressInput), 201);
}

export async function update(req: Request, res: Response) {
  const address = await addressService.update(req.user!.id, idOf(req), req.body as AddressInput);
  return sendSuccess(res, address);
}

export async function setDefault(req: Request, res: Response) {
  return sendSuccess(res, await addressService.setDefault(req.user!.id, idOf(req)));
}

export async function remove(req: Request, res: Response) {
  await addressService.remove(req.user!.id, idOf(req));
  return res.status(204).end();
}
