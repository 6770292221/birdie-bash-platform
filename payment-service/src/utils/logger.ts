const chalk = require('chalk');
const QRCode = require('qrcode-terminal');

export class Logger {
  private static formatTimestamp(): string {
    const now = new Date();
    return chalk.gray(`[${now.toISOString()}]`);
  }

  private static formatService(): string {
    return chalk.magenta.bold('[PAYMENT-SERVICE]');
  }

  static info(message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.blue('ℹ');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.blue(message)}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  static success(message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.green('✓');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.green(message)}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  static error(message: string, error?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.red('✗');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.red(message)}`);
    if (error) {
      if (error instanceof Error) {
        console.log(chalk.red(error.stack || error.message));
      } else {
        console.log(chalk.red(JSON.stringify(error, null, 2)));
      }
    }
  }

  static warning(message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.yellow('⚠');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.yellow(message)}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  static payment(message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.cyan('💳');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.cyan(message)}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  static qrCode(message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.yellow('📱');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.yellow(message)}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  static grpc(message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.magenta('🔌');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.magenta(message)}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  static server(message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.green('🚀');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.green(message)}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  static displayBanner(): void {
    console.log('\n');
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║                                                          ║'));
    console.log(chalk.cyan.bold('║') + chalk.yellow.bold('             🏸 BIRDIE BASH PLATFORM 🏸                   ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.white.bold('                   Payment Service                        ' ) + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║                                                          ║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════╝'));
    console.log('\n');
  }

  static displayQRCode(qrData: string, paymentInfo: any): void {
    console.log('\n' + chalk.yellow.bold('═'.repeat(60)));
    console.log(chalk.yellow.bold('                    QR CODE GENERATED                    '));
    console.log(chalk.yellow.bold('═'.repeat(60)));
    
    // Display payment information
    console.log(chalk.cyan.bold('\n💳 PAYMENT DETAILS:'));
    console.log(chalk.white(`   Amount: ${chalk.green.bold(paymentInfo.amount)} ${chalk.green.bold(paymentInfo.currency)}`));
    console.log(chalk.white(`   Reference: ${chalk.blue.bold(paymentInfo.paymentReference)}`));
    console.log(chalk.white(`   PromptPay ID: ${chalk.magenta.bold(paymentInfo.promptPayId)}`));
    console.log(chalk.white(`   Bank Account: ${chalk.magenta.bold(paymentInfo.bankAccount)}`));
    
    console.log(chalk.yellow.bold('\n📱 SCAN QR CODE TO PAY:'));
    console.log(chalk.gray('───────────────────────────────────────────────────────────'));
    
    try {
      // The qrData is now the actual PromptPay QR code payload from promptpay-qr library
      // Generate QR code in terminal using the payload directly
      QRCode.generate(qrData, { small: true }, (qrcode: string) => {
        console.log(chalk.white(qrcode));
      });
      
      console.log(chalk.gray('───────────────────────────────────────────────────────────'));
      console.log(chalk.yellow('📋 QR Data (PromptPay payload):'));
      console.log(chalk.gray(qrData));
      
    } catch (error) {
      console.log(chalk.red('❌ Error generating QR code:'), error);
      console.log(chalk.gray('Raw QR Data:'), chalk.white(qrData));
    }
  }

  static displayPaymentStatus(status: string, paymentId: string): void {
    const statusColors: { [key: string]: any } = {
      'pending': chalk.yellow,
      'processing': chalk.blue,
      'completed': chalk.green,
      'failed': chalk.red,
      'cancelled': chalk.gray,
      'refunded': chalk.yellowBright
    };
    
    const statusIcons: { [key: string]: string } = {
      'pending': '⏳',
      'processing': '🔄',
      'completed': '✅',
      'failed': '❌',
      'cancelled': '🚫',
      'refunded': '↩️'
    };
    
    const color = statusColors[status.toLowerCase()] || chalk.white;
    const icon = statusIcons[status.toLowerCase()] || '📋';
    
    console.log(chalk.cyan.bold('\n💳 PAYMENT STATUS UPDATE:'));
    console.log(`   ${icon} Status: ${color.bold(status.toUpperCase())}`);
    console.log(`   🆔 Payment ID: ${chalk.blue.bold(paymentId)}`);
    console.log(chalk.cyan.bold('─'.repeat(40)) + '\n');
  }
}