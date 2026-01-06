import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

interface ConnectedClient {
  socket: Socket;
  tenantId: string;
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private clients: Map<string, ConnectedClient> = new Map();
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly clickhouseService: ClickHouseService,
  ) {
    // Start broadcasting stats every 5 seconds
    this.startStatsBroadcast();
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const tenantId = payload.tenantId;
      const userId = payload.sub;

      this.clients.set(client.id, { socket: client, tenantId, userId });
      client.join(`tenant:${tenantId}`);

      this.logger.log(`Client connected: ${client.id} (tenant: ${tenantId})`);

      // Send initial stats
      await this.sendStatsToClient(client, tenantId);
    } catch (error) {
      this.logger.warn(`Connection rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:stats')
  async handleSubscribeStats(@ConnectedSocket() client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      await this.sendStatsToClient(client, clientInfo.tenantId);
    }
  }

  @SubscribeMessage('subscribe:logs')
  handleSubscribeLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { locationId?: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      const room = data.locationId
        ? `logs:${clientInfo.tenantId}:${data.locationId}`
        : `logs:${clientInfo.tenantId}`;
      client.join(room);
      this.logger.debug(`Client ${client.id} subscribed to ${room}`);
    }
  }

  // Called by log ingestion to broadcast new logs
  broadcastLog(tenantId: string, locationId: string, log: any) {
    this.server.to(`logs:${tenantId}`).emit('log', log);
    this.server.to(`logs:${tenantId}:${locationId}`).emit('log', log);
  }

  // Called to broadcast threat alerts
  broadcastThreat(tenantId: string, threat: any) {
    this.server.to(`tenant:${tenantId}`).emit('threat', threat);
  }

  private async sendStatsToClient(client: Socket, tenantId: string) {
    try {
      const stats = await this.clickhouseService.getSummaryStats(
        tenantId,
        '1h',
      );
      const topDomains = await this.clickhouseService.getTopBlockedDomains(
        tenantId,
        '1h',
        10,
      );

      client.emit('stats', {
        timestamp: new Date().toISOString(),
        summary: stats,
        topBlocked: topDomains,
      });
    } catch (error) {
      this.logger.error(`Failed to send stats: ${error.message}`);
    }
  }

  private startStatsBroadcast() {
    this.statsInterval = setInterval(async () => {
      const tenantIds = new Set<string>();
      this.clients.forEach((client) => tenantIds.add(client.tenantId));

      for (const tenantId of tenantIds) {
        try {
          const stats = await this.clickhouseService.getSummaryStats(
            tenantId,
            '1h',
          );
          this.server.to(`tenant:${tenantId}`).emit('stats:update', {
            timestamp: new Date().toISOString(),
            summary: stats,
          });
        } catch (error) {
          this.logger.error(
            `Stats broadcast failed for ${tenantId}: ${error.message}`,
          );
        }
      }
    }, 5000);
  }
}
