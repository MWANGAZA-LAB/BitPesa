import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LndClient } from '../lnd/lnd.client';
import { LightningNodeInfo } from '@bitpesa/shared-types';

@Injectable()
export class NodeService {
  private readonly logger = new Logger(NodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lndClient: LndClient,
  ) {}

  async getNodeInfo(): Promise<LightningNodeInfo> {
    try {
      this.logger.log('Getting Lightning node information');

      const info = await this.lndClient.getInfo();
      
      const nodeInfo: LightningNodeInfo = {
        identityPubkey: info.public_key,
        alias: info.alias,
        numPeers: info.num_peers,
        numChannels: info.num_channels,
        numActiveChannels: info.num_active_channels,
        blockHeight: info.block_height,
        blockHash: info.block_hash,
        syncedToChain: info.synced_to_chain,
        testnet: info.testnet,
        chains: info.chains,
        uris: info.uris,
        bestHeaderTimestamp: BigInt(info.best_header_timestamp),
        version: info.version,
        commitHash: info.commit_hash,
      };

      // Update node info in database
      await this.syncNodeInfo(nodeInfo);

      return nodeInfo;
    } catch (error) {
      this.logger.error('Failed to get node info:', error);
      throw error;
    }
  }

  async getBalance(): Promise<{
    total: number;
    confirmed: number;
    unconfirmed: number;
  }> {
    try {
      this.logger.log('Getting Lightning node balance');

      const [channelBalance, walletBalance] = await Promise.all([
        this.lndClient.getChannelBalance(),
        this.lndClient.getWalletBalance(),
      ]);

      return {
        total: channelBalance.balance + walletBalance.confirmed_balance,
        confirmed: channelBalance.confirmed_balance + walletBalance.confirmed_balance,
        unconfirmed: channelBalance.unconfirmed_balance + walletBalance.unconfirmed_balance,
      };
    } catch (error) {
      this.logger.error('Failed to get balance:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalChannels: number;
    activeChannels: number;
    totalCapacity: number;
    localBalance: number;
    remoteBalance: number;
    totalSent: number;
    totalReceived: number;
  }> {
    try {
      this.logger.log('Getting Lightning node statistics');

      const [nodeInfo, channels] = await Promise.all([
        this.getNodeInfo(),
        this.lndClient.getChannels(),
      ]);

      const totalChannels = channels.channels.length;
      const activeChannels = channels.channels.filter(channel => channel.active).length;
      const totalCapacity = channels.channels.reduce((sum, channel) => sum + channel.capacity, 0);
      const localBalance = channels.channels.reduce((sum, channel) => sum + channel.local_balance, 0);
      const remoteBalance = channels.channels.reduce((sum, channel) => sum + channel.remote_balance, 0);
      const totalSent = channels.channels.reduce((sum, channel) => sum + channel.total_satoshis_sent, 0);
      const totalReceived = channels.channels.reduce((sum, channel) => sum + channel.total_satoshis_received, 0);

      return {
        totalChannels,
        activeChannels,
        totalCapacity,
        localBalance,
        remoteBalance,
        totalSent,
        totalReceived,
      };
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      throw error;
    }
  }

  async syncNodeInfo(nodeInfo: LightningNodeInfo): Promise<void> {
    try {
      this.logger.log('Syncing node info with database');

      await this.prisma.lightningNode.upsert({
        where: { identityPubkey: nodeInfo.identityPubkey },
        update: {
          alias: nodeInfo.alias,
          numPeers: nodeInfo.numPeers,
          numChannels: nodeInfo.numChannels,
          numActiveChannels: nodeInfo.numActiveChannels,
          blockHeight: nodeInfo.blockHeight,
          blockHash: nodeInfo.blockHash,
          syncedToChain: nodeInfo.syncedToChain,
          testnet: nodeInfo.testnet,
          chains: nodeInfo.chains,
          uris: nodeInfo.uris,
          bestHeaderTimestamp: nodeInfo.bestHeaderTimestamp,
          version: nodeInfo.version,
          commitHash: nodeInfo.commitHash,
          updatedAt: new Date(),
        },
        create: {
          identityPubkey: nodeInfo.identityPubkey,
          alias: nodeInfo.alias,
          numPeers: nodeInfo.numPeers,
          numChannels: nodeInfo.numChannels,
          numActiveChannels: nodeInfo.numActiveChannels,
          blockHeight: nodeInfo.blockHeight,
          blockHash: nodeInfo.blockHash,
          syncedToChain: nodeInfo.syncedToChain,
          testnet: nodeInfo.testnet,
          chains: nodeInfo.chains,
          uris: nodeInfo.uris,
          bestHeaderTimestamp: nodeInfo.bestHeaderTimestamp,
          version: nodeInfo.version,
          commitHash: nodeInfo.commitHash,
        },
      });

      this.logger.log('Node info synced with database');
    } catch (error) {
      this.logger.error('Failed to sync node info:', error);
      throw error;
    }
  }

  async getNodeHistory(limit: number = 100): Promise<LightningNodeInfo[]> {
    try {
      this.logger.log(`Getting node history, limit: ${limit}`);

      const nodes = await this.prisma.lightningNode.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return nodes.map(node => ({
        identityPubkey: node.identityPubkey,
        alias: node.alias,
        numPeers: node.numPeers,
        numChannels: node.numChannels,
        numActiveChannels: node.numActiveChannels,
        blockHeight: node.blockHeight,
        blockHash: node.blockHash,
        syncedToChain: node.syncedToChain,
        testnet: node.testnet,
        chains: node.chains,
        uris: node.uris,
        bestHeaderTimestamp: node.bestHeaderTimestamp,
        version: node.version,
        commitHash: node.commitHash,
      }));
    } catch (error) {
      this.logger.error('Failed to get node history:', error);
      throw error;
    }
  }
}
