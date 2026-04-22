import { Client } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

export interface ServerStatus {
  uptime: string;
  diskUsage: string;
  memoryUsage: string;
}

export class ServerClient {
  private host: string;
  private username: string;
  private privateKeyPath: string;

  constructor(
    host: string = '95.174.94.86',
    username: string = 'user1',
    privateKeyPath: string = path.join(process.cwd(), 'secrets', 'server_key')
  ) {
    this.host = host;
    this.username = username;
    this.privateKeyPath = privateKeyPath;
  }

  private getKey(): string {
    try {
      if (!fs.existsSync(this.privateKeyPath)) {
        // Fallback for different CWD scenarios or dev environment
        const altPath = path.join(__dirname, '../../../../secrets/server_key');
        if (fs.existsSync(altPath)) {
          return fs.readFileSync(altPath, 'utf8');
        }
        throw new Error(`Private key not found at ${this.privateKeyPath}`);
      }
      return fs.readFileSync(this.privateKeyPath, 'utf8');
    } catch (error) {
      console.error('Failed to load private key:', error);
      throw error;
    }
  }

  public async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      conn
        .on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              conn.end();
              return reject(err);
            }
            let data = '';
            stream
              .on('close', (_code: unknown, _signal: unknown) => {
                conn.end();
                resolve(data.trim());
              })
              .on('data', (chunk: any) => {
                data += chunk;
              })
              .stderr.on('data', (chunk: any) => {
                console.error('STDERR:', chunk.toString());
              });
          });
        })
        .on('error', (err) => {
          reject(err);
        })
        .connect({
          host: this.host,
          port: 22,
          username: this.username,
          privateKey: this.getKey(),
          readyTimeout: 20000, // 20 seconds timeout
        });
    });
  }

  public async getStatus(): Promise<ServerStatus> {
    try {
      const uptime = await this.executeCommand('uptime -p');
      const diskUsage = await this.executeCommand('df -h / | tail -1 | awk \'{print $5}\'');
      const memoryUsage = await this.executeCommand('free -m | grep Mem | awk \'{print $3 "/" $2 " MB"}\'');

      return {
        uptime,
        diskUsage,
        memoryUsage
      };
    } catch (error) {
      console.error('Error fetching server status:', error);
      throw error;
    }
  }
}
