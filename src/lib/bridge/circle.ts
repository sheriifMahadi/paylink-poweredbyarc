import { Address } from 'viem';

export interface BridgeQuoteParams {
  sourceChain: string;
  destinationChain: string;
  amount: number;
  sender: Address;
}

export interface BridgeQuote {
  sourceChain: string;
  destinationChain: string;
  amount: number;
  fee: number;
  totalAmount: number;
  estimatedSettleTime: number; // in seconds
}

export class CircleBridgeService {
  private readonly CIRCLE_API_URL = 'https://api.circle.com/v1/bridge';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getQuote(params: BridgeQuoteParams): Promise<BridgeQuote> {
    try {
      const response = await fetch(`${this.CIRCLE_API_URL}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          source: params.sourceChain,
          destination: params.destinationChain,
          amount: params.amount.toString(),
          tokenSymbol: 'USDC'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bridge quote');
      }

      const data = await response.json();
      
      return {
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        amount: params.amount,
        fee: parseFloat(data.fee),
        totalAmount: parseFloat(data.totalAmount),
        estimatedSettleTime: data.estimatedSettleTime
      };
    } catch (error) {
      console.error('Circle Bridge Quote Error:', error);
      throw error;
    }
  }

  async initiateBridge(params: BridgeQuoteParams): Promise<string> {
    try {
      const response = await fetch(`${this.CIRCLE_API_URL}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          source: params.sourceChain,
          destination: params.destinationChain,
          amount: params.amount.toString(),
          tokenSymbol: 'USDC',
          sender: params.sender,
          recipient: params.sender // Bridge to the same wallet
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate bridge transfer');
      }

      const data = await response.json();
      return data.transferId;
    } catch (error) {
      console.error('Circle Bridge Transfer Error:', error);
      throw error;
    }
  }

  async checkTransferStatus(transferId: string): Promise<string> {
    try {
      const response = await fetch(`${this.CIRCLE_API_URL}/transfer/${transferId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check transfer status');
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Circle Bridge Status Error:', error);
      throw error;
    }
  }
}

// Instantiate the service with environment variable
export const circleBridgeService = new CircleBridgeService(
  process.env.CIRCLE_API_KEY || ''
);