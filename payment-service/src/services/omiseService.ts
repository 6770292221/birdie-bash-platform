import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

interface OmiseSourceResponse {
  id: string;
  object: string;
  type: string;
  flow: string;
  amount: number;
  currency: string;
  scannable_code: {
    type: string;
    image: {
      download_uri: string;
    };
  };
}

interface OmiseChargeResponse {
  id: string;
  object: string;
  amount: number;
  currency: string;
  status: string;
  source: {
    id: string;
    type: string;
    scannable_code?: {
      image: {
        download_uri: string;
      };
    };
  };
  created_at: string;
}

export class OmiseService {
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.omise.co';

  constructor() {
    this.publicKey = process.env.OMISE_PUBLIC_KEY!;
    this.secretKey = process.env.OMISE_SECRET_KEY!;
    
    if (!this.publicKey || !this.secretKey) {
      throw new Error('OMISE_PUBLIC_KEY and OMISE_SECRET_KEY must be set in environment variables');
    }
  }

  /**
   * Create Omise source for PromptPay payment
   */
  async createSource(amount: number, currency: string = 'THB'): Promise<OmiseSourceResponse> {
    try {
      // Build encoded auth header from public key (username) with no password
      const authHeader = 'Basic ' + Buffer.from(`${this.publicKey}:`).toString('base64');
      
      // Debug logging
      Logger.info('Creating Omise source with credentials', {
        authHeaderPrefix: authHeader.substring(0, 20) + '...',
        amount,
        currency
      });
      
      const requestData = new URLSearchParams({
        amount: amount.toString(),
        currency: currency,
        type: 'promptpay',
        'qr_settings[image_type]': 'png'
      });

      Logger.info('Request payload', {
        url: `${this.baseUrl}/sources`,
        data: requestData.toString()
      });
      
      const response = await axios.post(
        `${this.baseUrl}/sources`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authHeader
          }
        }
      );

      Logger.info('Omise source created successfully', {
        sourceId: response.data.id,
        amount,
        currency
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        Logger.error('Omise API Error Details', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      Logger.error('Failed to create Omise source', error);
      throw new Error(`Omise source creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Omise charge using source
   */
  async createCharge(amount: number, currency: string, sourceId: string): Promise<OmiseChargeResponse> {
    try {
      // Build encoded auth header from secret key (username) with no password
      const authHeader = 'Basic ' + Buffer.from(`${this.secretKey}:`).toString('base64');
      
      const response = await axios.post(
        `${this.baseUrl}/charges`,
        new URLSearchParams({
          amount: amount.toString(),
          currency: currency,
          source: sourceId
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authHeader
          }
        }
      );

      Logger.info('Omise charge created successfully', {
        chargeId: response.data.id,
        sourceId,
        amount,
        currency,
        status: response.data.status
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to create Omise charge', error);
      throw new Error(`Omise charge creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download and display QR code in console
   */
  async displayQRCode(downloadUri: string): Promise<void> {
    try {
      Logger.info('Downloading QR code', { downloadUri });
      
      const response = await axios.get(downloadUri, { 
        responseType: 'arraybuffer' 
      });
      
      // Save QR code image temporarily
      const tempPath = path.join(__dirname, '../../temp_qr.png');
      fs.writeFileSync(tempPath, response.data);
      
      Logger.success('QR Code downloaded and saved', { path: tempPath });
      
      // Display header
      console.log('\n' + '='.repeat(60));
      console.log('                    🏸 PAYMENT QR CODE 🏸');
      console.log('='.repeat(60));
      console.log(`📱 Scan this QR code with your banking app to pay`);
      console.log('='.repeat(60));
      
      try {
        // Use dynamic import for terminal-image (ES module)
        const { default: terminalImage } = await import('terminal-image');
        
        // Display the QR code image in terminal
        const qrImageDisplay = await terminalImage.file(tempPath, { width: 40, height: 40 });
        console.log(qrImageDisplay);
      } catch (displayError) {
        Logger.warning('Could not display QR code in terminal, showing file info instead', displayError);
        console.log(`🔗 QR Code Image: ${tempPath}`);
        console.log(`🌐 Direct Download: ${downloadUri}`);
      }
      
      console.log('='.repeat(60) + '\n');
      
      // Clean up temp file after a delay
      setTimeout(() => {
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
            Logger.info('Temporary QR code file cleaned up');
          }
        } catch (error) {
          Logger.warning('Failed to clean up temporary QR code file', error);
        }
      }, 30000); // Clean up after 30 seconds
      
    } catch (error) {
      Logger.error('Failed to download/display QR code', error);
      throw new Error(`QR code display failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const omiseService = new OmiseService();