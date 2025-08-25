export interface ContractService {
  checkUserInitialized: (userAddress: string) => Promise<boolean>;
  initializeUserAccount: (userAddress: string, initialConfig: any, riskLimits: any) => Promise<any>;
  getUserBalances: (userAddress: string) => Promise<any>;
  getUserConfig: (userAddress: string) => Promise<any>;
  getUserTradeHistory: (userAddress: string, limit?: number) => Promise<any>;
  getUserPerformanceMetrics: (userAddress: string, days?: number) => Promise<any>;
}

export class ApiContractService implements ContractService {
  private baseUrl = '/api/contract';

  private async makeRequest(action: string, params: any = {}) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...params,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      return result.data;
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      throw error;
    }
  }

  async checkUserInitialized(userAddress: string): Promise<boolean> {
    const data = await this.makeRequest('check_user_initialized', { userAddress });
    return data.isInitialized;
  }

  async initializeUserAccount(userAddress: string, initialConfig: any, riskLimits: any): Promise<any> {
    return await this.makeRequest('initialize_user_account', {
      userAddress,
      initialConfig,
      riskLimits,
    });
  }

  async getUserBalances(userAddress: string): Promise<any> {
    const data = await this.makeRequest('get_user_balances', { userAddress });
    return data.balances;
  }

  async getUserConfig(userAddress: string): Promise<any> {
    const data = await this.makeRequest('get_user_config', { userAddress });
    return data.config;
  }

  async getUserTradeHistory(userAddress: string, limit: number = 10): Promise<any> {
    const data = await this.makeRequest('get_user_trade_history', {
      userAddress,
      limit,
    });
    return data.tradeHistory;
  }

  async getUserPerformanceMetrics(userAddress: string, days: number = 30): Promise<any> {
    const data = await this.makeRequest('get_user_performance_metrics', {
      userAddress,
      days,
    });
    return data.metrics;
  }
}

// Export a singleton instance
export const contractService = new ApiContractService();