import { Injectable, Logger } from '@nestjs/common';
import { MinmoService } from './minmo.service';
import { SwapWebhookDto } from './dto/swap-webhook.dto';

@Injectable()
export class WebhookHandler {
  private readonly logger = new Logger(WebhookHandler.name);

  constructor(private readonly minmoService: MinmoService) {}

  /**
   * Process Minmo webhook events
   */
  async processWebhook(dto: SwapWebhookDto): Promise<void> {
    try {
      this.logger.log(`Processing webhook for swap ${dto.swapId}: ${dto.event}`);

      // Handle different webhook events
      switch (dto.event) {
        case 'swap.created':
          await this.handleSwapCreated(dto);
          break;
        case 'swap.confirmed':
          await this.handleSwapConfirmed(dto);
          break;
        case 'swap.completed':
          await this.handleSwapCompleted(dto);
          break;
        case 'swap.failed':
          await this.handleSwapFailed(dto);
          break;
        case 'swap.expired':
          await this.handleSwapExpired(dto);
          break;
        default:
          this.logger.warn(`Unknown webhook event: ${dto.event}`);
      }
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle swap created event
   */
  private async handleSwapCreated(dto: SwapWebhookDto): Promise<void> {
    this.logger.log(`Swap ${dto.swapId} created successfully`);
    // Notify transaction service that swap is ready for payment
    // This could trigger a notification to the user
  }

  /**
   * Handle swap confirmed event (BTC received)
   */
  private async handleSwapConfirmed(dto: SwapWebhookDto): Promise<void> {
    this.logger.log(`Swap ${dto.swapId} confirmed - BTC received`);
    
    // This is the critical event - BTC has been received
    // Notify transaction service to proceed with M-Pesa payment
    // TODO: Send notification to transaction service
    // await this.notifyTransactionService(dto.swapId, 'BTC_RECEIVED');
  }

  /**
   * Handle swap completed event
   */
  private async handleSwapCompleted(dto: SwapWebhookDto): Promise<void> {
    this.logger.log(`Swap ${dto.swapId} completed successfully`);
    
    // Swap is fully completed
    // Update transaction status to completed
    // TODO: Send notification to transaction service
    // await this.notifyTransactionService(dto.swapId, 'COMPLETED');
  }

  /**
   * Handle swap failed event
   */
  private async handleSwapFailed(dto: SwapWebhookDto): Promise<void> {
    this.logger.error(`Swap ${dto.swapId} failed: ${dto.data?.reason || 'Unknown reason'}`);
    
    // Swap failed - update transaction status
    // TODO: Send notification to transaction service
    // await this.notifyTransactionService(dto.swapId, 'FAILED', dto.data?.reason);
  }

  /**
   * Handle swap expired event
   */
  private async handleSwapExpired(dto: SwapWebhookDto): Promise<void> {
    this.logger.log(`Swap ${dto.swapId} expired`);
    
    // Swap expired - user didn't send BTC in time
    // TODO: Send notification to transaction service
    // await this.notifyTransactionService(dto.swapId, 'EXPIRED');
  }

  /**
   * Notify transaction service about swap status change
   * TODO: Implement HTTP client to notify transaction service
   */
  private async notifyTransactionService(swapId: string, status: string, reason?: string): Promise<void> {
    try {
      // This would make an HTTP call to the transaction service
      // to update the transaction status based on Minmo events
      this.logger.log(`Notifying transaction service: swap ${swapId} status ${status}`);
      
      // Example implementation:
      // await this.httpService.post(`${TRANSACTION_SERVICE_URL}/webhooks/minmo`, {
      //   swapId,
      //   status,
      //   reason,
      // }).toPromise();
    } catch (error) {
      this.logger.error(`Failed to notify transaction service: ${error.message}`);
    }
  }
}
