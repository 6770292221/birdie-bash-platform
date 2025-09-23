import chalk from 'chalk';

export class Logger {
  private static formatTimestamp(): string {
    const now = new Date();
    return chalk.gray(`[${now.toISOString()}]`);
  }

  private static formatService(): string {
    return chalk.magenta.bold('[MATCHING-SERVICE]');
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


  static server(message: string, data?: any): void {
    const timestamp = this.formatTimestamp();
    const service = this.formatService();
    const icon = chalk.green('🚀');
    
    console.log(`${timestamp} ${service} ${icon} ${chalk.green(message)}`);
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }
}