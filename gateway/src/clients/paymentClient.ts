import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '../proto/payment.proto');

// Load proto definition once
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const paymentProto = (grpc.loadPackageDefinition(packageDefinition) as any).payment;

export interface PlayerPaymentsQuery {
  player_id: string;
  status?: string; // numeric enum string
  event_id?: string;
}

export interface EventPaymentsQuery {
  event_id: string;
  status?: string; // numeric enum string
}

// Simple singleton client
let client: any;

export function getPaymentGrpcClient() {
  if (!client) {
    const host = process.env.PAYMENT_SERVICE_GRPC_URL || 'localhost:50051';
    client = new paymentProto.PaymentService(host, grpc.credentials.createInsecure());
  }
  return client;
}

function promisify<TReq, TRes>(fn: Function, req: TReq): Promise<TRes> {
  return new Promise((resolve, reject) => {
    fn.call(getPaymentGrpcClient(), req, (err: any, resp: TRes) => {
      if (err) return reject(err);
      resolve(resp);
    });
  });
}

export async function fetchPlayerPayments(query: PlayerPaymentsQuery) {
  const req: any = { player_id: query.player_id };
  if (query.status) req.status = query.status;
  if (query.event_id) req.event_id = query.event_id;
  return promisify<typeof req, any>(getPaymentGrpcClient().GetPlayerPayments, req);
}

export async function fetchEventPayments(query: EventPaymentsQuery) {
  const req: any = { event_id: query.event_id };
  if (query.status) req.status = query.status;
  return promisify<typeof req, any>(getPaymentGrpcClient().GetEventPayments, req);
}

// Mapping helpers to present cleaner REST responses
export function mapPlayerPaymentsGrpcToRest(grpcResp: any) {
  return (grpcResp.payments || []).map((p: any) => ({
    id: p.payment_id,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    eventId: p.event_id,
    createdAt: new Date(p.created_at).toISOString(),
    updatedAt: new Date(p.updated_at).toISOString(),
  }));
}

export function mapEventPaymentsGrpcToRest(grpcResp: any) {
  return (grpcResp.payments || []).map((p: any) => ({
    playerId: p.player_id,
    amount: p.amount,
    status: p.status,
  }));
}
