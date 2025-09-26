declare module 'amqplib' {
  export interface ConsumeMessage {
    content: Buffer;
    fields: any;
    properties: any;
  }
  export interface Channel {
    assertExchange(exchange: string, type: string, options?: any): Promise<any>;
    assertQueue(queue: string, options?: any): Promise<any>;
    bindQueue(queue: string, exchange: string, pattern: string): Promise<any>;
    publish(exchange: string, routingKey: string, content: Buffer, options?: any): boolean;
    consume(queue: string, onMessage: (msg: ConsumeMessage | null) => void, options?: any): Promise<any>;
    ack(msg: ConsumeMessage): void;
    nack(msg: ConsumeMessage, allUpTo?: boolean, requeue?: boolean): void;
  }
  export interface Connection {
    createChannel(): Promise<Channel>;
  }
  export function connect(url: string): Promise<Connection>;
}
