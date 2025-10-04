import { Request, Response } from 'express';
import { fetchPlayerPayments, fetchEventPayments, mapPlayerPaymentsGrpcToRest, mapEventPaymentsGrpcToRest } from '../clients/paymentClient';

// Controller: Get payments for a player
export async function getPlayerPayments(req: Request, res: Response) {
  try {
    const { playerId } = req.params;
    const { status, eventId } = req.query as any;
    const grpcResp = await fetchPlayerPayments({ player_id: playerId, status, event_id: eventId });
    const payments = mapPlayerPaymentsGrpcToRest(grpcResp);
    res.json({ payments });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[Gateway][Payments] get player payments error', err);
    res.status(502).json({ error: 'Failed to fetch player payments', details: err.message });
  }
}

// Controller: Get payments for an event
export async function getEventPayments(req: Request, res: Response) {
  try {
    const { eventId } = req.params;
    const { status } = req.query as any;
    const grpcResp = await fetchEventPayments({ event_id: eventId, status });
    const payments = mapEventPaymentsGrpcToRest(grpcResp);
    res.json({ payments });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[Gateway][Payments] get event payments error', err);
    res.status(502).json({ error: 'Failed to fetch event payments', details: err.message });
  }
}
