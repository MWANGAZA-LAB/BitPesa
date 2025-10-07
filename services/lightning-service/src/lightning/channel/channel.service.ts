import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LndClient } from '../lnd/lnd.client';
import { LightningChannel } from '@bitpesa/shared-types';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lndClient: LndClient,
  ) {}

  async getChannels(active?: boolean): Promise<LightningChannel[]> {
    try {
      this.logger.log(`Getting Lightning channels, active filter: ${active}`);

      // Get channels from LND
      const lndChannels = await this.lndClient.getChannels();
      
      // Convert to our format and filter if needed
      const channels: LightningChannel[] = lndChannels.channels.map(channel => ({
        channelId: channel.id,
        chanPoint: channel.channel_point,
        capacity: BigInt(channel.capacity),
        localBalance: BigInt(channel.local_balance),
        remoteBalance: BigInt(channel.remote_balance),
        commitFee: BigInt(channel.commit_fee),
        commitWeight: BigInt(channel.commit_weight),
        feePerKw: BigInt(channel.fee_per_kw),
        unsettledBalance: BigInt(channel.unsettled_balance),
        totalSatoshisSent: BigInt(channel.total_satoshis_sent),
        totalSatoshisReceived: BigInt(channel.total_satoshis_received),
        numUpdates: BigInt(channel.num_updates),
        active: channel.active,
        private: channel.private,
        initiator: channel.initiator,
        chanStatusFlags: channel.chan_status_flags,
        localChanReserveSat: BigInt(channel.local_chan_reserve_sat),
        remoteChanReserveSat: BigInt(channel.remote_chan_reserve_sat),
        staticRemoteKey: channel.static_remote_key,
        commitmentType: channel.commitment_type,
        lifetime: BigInt(channel.lifetime),
        uptime: BigInt(channel.uptime),
        closeAddress: channel.close_address,
        pushAmountSat: BigInt(channel.push_amount_sat),
        thawHeight: BigInt(channel.thaw_height),
        localConstraints: channel.local_constraints,
        remoteConstraints: channel.remote_constraints,
        aliasScids: channel.alias_scids || [],
        zeroConfConfirmedScid: channel.zero_conf_confirmed_scid,
        peerAlias: channel.peer_alias,
        peerScidAlias: channel.peer_scid_alias,
        mempoolSpace: channel.mempool_space,
        mempoolUpdate: channel.mempool_update,
      }));

      // Filter by active status if specified
      if (active !== undefined) {
        return channels.filter(channel => channel.active === active);
      }

      return channels;
    } catch (error) {
      this.logger.error('Failed to get channels:', error);
      throw error;
    }
  }

  async getChannelBalance(): Promise<{
    total: number;
    confirmed: number;
    unconfirmed: number;
  }> {
    try {
      this.logger.log('Getting channel balance');

      const balance = await this.lndClient.getChannelBalance();
      
      return {
        total: balance.balance,
        confirmed: balance.confirmed_balance,
        unconfirmed: balance.unconfirmed_balance,
      };
    } catch (error) {
      this.logger.error('Failed to get channel balance:', error);
      throw error;
    }
  }

  async getChannelStats(): Promise<{
    totalChannels: number;
    activeChannels: number;
    totalCapacity: bigint;
    localBalance: bigint;
    remoteBalance: bigint;
    totalSent: bigint;
    totalReceived: bigint;
  }> {
    try {
      this.logger.log('Getting channel statistics');

      const channels = await this.getChannels();
      
      const totalChannels = channels.length;
      const activeChannels = channels.filter(channel => channel.active).length;
      const totalCapacity = channels.reduce((sum, channel) => sum + channel.capacity, BigInt(0));
      const localBalance = channels.reduce((sum, channel) => sum + channel.localBalance, BigInt(0));
      const remoteBalance = channels.reduce((sum, channel) => sum + channel.remoteBalance, BigInt(0));
      const totalSent = channels.reduce((sum, channel) => sum + channel.totalSatoshisSent, BigInt(0));
      const totalReceived = channels.reduce((sum, channel) => sum + channel.totalSatoshisReceived, BigInt(0));

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
      this.logger.error('Failed to get channel stats:', error);
      throw error;
    }
  }

  async syncChannels(): Promise<void> {
    try {
      this.logger.log('Syncing channels with database');

      const channels = await this.getChannels();
      
      // Update or create channels in database
      for (const channel of channels) {
        await this.prisma.lightningChannel.upsert({
          where: { channelId: channel.channelId },
          update: {
            capacity: channel.capacity,
            localBalance: channel.localBalance,
            remoteBalance: channel.remoteBalance,
            commitFee: channel.commitFee,
            commitWeight: channel.commitWeight,
            feePerKw: channel.feePerKw,
            unsettledBalance: channel.unsettledBalance,
            totalSatoshisSent: channel.totalSatoshisSent,
            totalSatoshisReceived: channel.totalSatoshisReceived,
            numUpdates: channel.numUpdates,
            active: channel.active,
            private: channel.private,
            initiator: channel.initiator,
            chanStatusFlags: channel.chanStatusFlags,
            localChanReserveSat: channel.localChanReserveSat,
            remoteChanReserveSat: channel.remoteChanReserveSat,
            staticRemoteKey: channel.staticRemoteKey,
            commitmentType: channel.commitmentType,
            lifetime: channel.lifetime,
            uptime: channel.uptime,
            closeAddress: channel.closeAddress,
            pushAmountSat: channel.pushAmountSat,
            thawHeight: channel.thawHeight,
            localConstraints: channel.localConstraints,
            remoteConstraints: channel.remoteConstraints,
            aliasScids: channel.aliasScids,
            zeroConfConfirmedScid: channel.zeroConfConfirmedScid,
            peerAlias: channel.peerAlias,
            peerScidAlias: channel.peerScidAlias,
            mempoolSpace: channel.mempoolSpace,
            mempoolUpdate: channel.mempoolUpdate,
            updatedAt: new Date(),
          },
          create: {
            channelId: channel.channelId,
            chanPoint: channel.chanPoint,
            capacity: channel.capacity,
            localBalance: channel.localBalance,
            remoteBalance: channel.remoteBalance,
            commitFee: channel.commitFee,
            commitWeight: channel.commitWeight,
            feePerKw: channel.feePerKw,
            unsettledBalance: channel.unsettledBalance,
            totalSatoshisSent: channel.totalSatoshisSent,
            totalSatoshisReceived: channel.totalSatoshisReceived,
            numUpdates: channel.numUpdates,
            active: channel.active,
            private: channel.private,
            initiator: channel.initiator,
            chanStatusFlags: channel.chanStatusFlags,
            localChanReserveSat: channel.localChanReserveSat,
            remoteChanReserveSat: channel.remoteChanReserveSat,
            staticRemoteKey: channel.staticRemoteKey,
            commitmentType: channel.commitmentType,
            lifetime: channel.lifetime,
            uptime: channel.uptime,
            closeAddress: channel.closeAddress,
            pushAmountSat: channel.pushAmountSat,
            thawHeight: channel.thawHeight,
            localConstraints: channel.localConstraints,
            remoteConstraints: channel.remoteConstraints,
            aliasScids: channel.aliasScids,
            zeroConfConfirmedScid: channel.zeroConfConfirmedScid,
            peerAlias: channel.peerAlias,
            peerScidAlias: channel.peerScidAlias,
            mempoolSpace: channel.mempoolSpace,
            mempoolUpdate: channel.mempoolUpdate,
          },
        });
      }

      this.logger.log(`Synced ${channels.length} channels with database`);
    } catch (error) {
      this.logger.error('Failed to sync channels:', error);
      throw error;
    }
  }
}
